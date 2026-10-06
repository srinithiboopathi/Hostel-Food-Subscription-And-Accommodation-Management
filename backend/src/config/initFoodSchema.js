const { query } = require('./database');

/**
 * Initializes food_plans and food_subscriptions tables in MySQL
 */
async function initFoodSchema() {
  try {
    // 1. Create food_plans table
    await query(`
      CREATE TABLE IF NOT EXISTS food_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT NULL,
        has_breakfast BOOLEAN NOT NULL DEFAULT TRUE,
        has_lunch BOOLEAN NOT NULL DEFAULT TRUE,
        has_snacks BOOLEAN NOT NULL DEFAULT FALSE,
        has_dinner BOOLEAN NOT NULL DEFAULT TRUE,
        monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 3500.00,
        status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_plan_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Create food_subscriptions table
    await query(`
      CREATE TABLE IF NOT EXISTS food_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        plan_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        monthly_price DECIMAL(10, 2) NOT NULL,
        status ENUM('ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
        paused_at DATETIME NULL,
        cancelled_at DATETIME NULL,
        remarks TEXT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES food_plans(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_sub_student (student_id),
        INDEX idx_sub_status (status),
        INDEX idx_sub_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Seed default food plans if empty
    const [existingPlans] = await query('SELECT COUNT(*) AS count FROM food_plans');
    if (existingPlans[0]?.count === 0) {
      await query(`
        INSERT INTO food_plans (name, code, description, has_breakfast, has_lunch, has_snacks, has_dinner, monthly_price, status)
        VALUES 
        ('Full Board Standard', 'FP-STD', 'Complete daily dining covering Breakfast, Lunch, and Dinner with balanced nutritional standards.', 1, 1, 0, 1, 3600.00, 'ACTIVE'),
        ('Executive All-Inclusive', 'FP-EXEC', 'Premium dining covering 4 daily meals: Breakfast, Lunch, Evening Snacks & Tea, and Special Dinner.', 1, 1, 1, 1, 4500.00, 'ACTIVE'),
        ('Day Scholar Lunch Only', 'FP-LUNCH', 'Single meal package for day scholars covering hot afternoon lunch from Monday to Saturday.', 0, 1, 0, 0, 1800.00, 'ACTIVE'),
        ('Breakfast & Dinner Saver', 'FP-BD', 'Dual meal combo for students with external midday internships or classes.', 1, 0, 0, 1, 2800.00, 'ACTIVE');
      `);
      console.log('✅ Default Food Plans seeded successfully.');
    }

    // 4. Seed initial food subscriptions for active resident students if none exist
    const [existingSubs] = await query('SELECT COUNT(*) AS count FROM food_subscriptions');
    if (existingSubs[0]?.count === 0) {
      const [activeStudents] = await query("SELECT id FROM students WHERE status = 'ACTIVE'");
      const [stdPlan] = await query("SELECT id, monthly_price FROM food_plans WHERE code = 'FP-STD' LIMIT 1");

      if (activeStudents.length > 0 && stdPlan.length > 0) {
        const planId = stdPlan[0].id;
        const price = stdPlan[0].monthly_price;
        const currentYear = new Date().getFullYear();
        const startDate = `${currentYear}-01-01`;
        const endDate = `${currentYear}-12-31`;

        for (const student of activeStudents) {
          await query(
            `INSERT INTO food_subscriptions (student_id, plan_id, start_date, end_date, monthly_price, status, remarks)
             VALUES (?, ?, ?, ?, ?, 'ACTIVE', 'Auto-enrolled residential mess subscription')`,
            [student.id, planId, startDate, endDate, price]
          );
        }
        console.log(`✅ Seeded ${activeStudents.length} initial food subscriptions.`);
      }
    }

    return true;
  } catch (error) {
    console.error('Error initializing food schema:', error);
    throw error;
  }
}

module.exports = { initFoodSchema };
