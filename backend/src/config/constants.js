const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  WARDEN: 'WARDEN',
  MESS_MANAGER: 'MESS_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  STUDENT: 'STUDENT',
});

const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
});

module.exports = {
  ROLES,
  USER_STATUS,
};
