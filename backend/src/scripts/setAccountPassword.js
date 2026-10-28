const readline = require('readline/promises');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

function readSecret(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Run this command in a private interactive terminal.'));
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const stdin = process.stdin;
    const finish = (error) => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') {
          finish(new Error('Password update cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= ' ') value += character;
      }
    };

    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function setAccountPassword() {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = (await terminal.question('Account email: ')).trim().toLowerCase();
    terminal.close();
    if (!email) throw new Error('Account email is required.');

    const [users] = await pool.query(
      'SELECT id, role FROM users WHERE LOWER(email) = ? AND status = ? LIMIT 1',
      [email, 'ACTIVE']
    );
    if (users.length === 0) throw new Error('No active account exists for that email.');

    const password = await readSecret('New password (minimum 12 characters): ');
    const confirmation = await readSecret('Confirm new password: ');
    if (password.length < 12) throw new Error('Password must be at least 12 characters.');
    if (password !== confirmation) throw new Error('Passwords do not match.');

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, users[0].id]);
    console.log(`Password updated for ${users[0].role} account. The password was not displayed.`);
  } finally {
    terminal.close();
    await pool.end();
  }
}

setAccountPassword().catch((error) => {
  console.error(`Password update failed: ${error.message}`);
  process.exitCode = 1;
});
