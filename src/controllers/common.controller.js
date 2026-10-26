const mockDb = require('../models/mockDb');
const { success } = require('../utils/response');
const { deptName, doctorName } = require('../utils/helpers');

const getDepartments = (req, res) => success(res, mockDb.all('departments'));

const getDoctors = (req, res) => {
  const { departmentId } = req.query;
  let doctors = mockDb.all('doctors');
  if (departmentId) doctors = doctors.filter((d) => d.department_id === departmentId);
  success(res, doctors.map((d) => ({ ...d, department_name: deptName(d.department_id) })));
};

const getSchedules = (req, res) => {
  const { doctorId, date } = req.query;
  let schedules = mockDb.all('schedules');
  if (doctorId) schedules = schedules.filter((s) => s.doctor_id === doctorId);
  if (date) schedules = schedules.filter((s) => s.work_date === date);
  success(res, schedules.map((s) => ({ ...s, doctor_name: doctorName(s.doctor_id), department_name: deptName(s.department_id) })));
};

const getDrugs = (req, res) => success(res, mockDb.all('drugs'));

module.exports = { getDepartments, getDoctors, getSchedules, getDrugs };
