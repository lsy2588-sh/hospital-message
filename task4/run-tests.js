// HIS 门诊挂号子系统 —— 任务4 自动化测试脚本（功能 + 安全/RBAC）
// 前置：后端已启动（npm run dev，端口 3000）
// 运行：node task4/run-tests.js
const BASE = 'http://localhost:3000/api';

const results = [];
let passed = 0;
let failed = 0;

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }
  return { status: res.status, data };
}

function check(name, condition, extra = '') {
  if (condition) { passed++; results.push(`PASS  ${name}`); }
  else { failed++; results.push(`FAIL  ${name}  ${extra}`); }
}

async function login(username, password) {
  const r = await call('POST', '/auth/login', { body: { username, password } });
  return r.data?.data?.token || null;
}

async function main() {
  // ============ 1. 认证模块 ============
  console.log('=== 1. 认证模块 ===');

  const tPatient = await login('patient11', 'patient123');
  const tDoctor = await login('doctor1', 'doctor123');
  const tCashier = await login('cashier1', 'cashier123');
  const tPharmacist = await login('pharmacist1', 'pharma123');
  const tAdmin = await login('admin', 'admin123');

  check('登录成功-患者 patient11', !!tPatient);
  check('登录成功-医生 doctor1', !!tDoctor);
  check('登录成功-收费员 cashier1', !!tCashier);
  check('登录成功-药师 pharmacist1', !!tPharmacist);
  check('登录成功-管理员 admin', !!tAdmin);

  const badLogin = await call('POST', '/auth/login', { body: { username: 'patient11', password: 'wrong' } });
  check('错误密码返回 401', badLogin.status === 401);

  const noUser = await call('POST', '/auth/login', { body: { username: 'nobody', password: 'xxx' } });
  check('不存在用户返回 401', noUser.status === 401);

  const shortPwd = await call('POST', '/auth/register', { body: { username: 'u_tmp', password: '123', name: 'x' } });
  check('注册密码<6 返回 400', shortPwd.status === 400);

  const noPwd = await call('POST', '/auth/login', { body: { username: 'patient11' } });
  check('登录缺密码字段返回 400', noPwd.status === 400);

  // ============ 2. 未登录 / 无效 Token ============
  console.log('=== 2. 未登录 / 无效 Token ===');

  const noAuth = await call('GET', '/registrations');
  check('无 Token 访问返回 401', noAuth.status === 401);

  const badToken = await call('GET', '/registrations', { token: 'invalid.token.here' });
  check('伪造 Token 返回 401', badToken.status === 401);

  const tampered = await call('GET', '/registrations', { token: tPatient.slice(0, -3) + 'abc' });
  check('篡改 Token 返回 401', tampered.status === 401);

  // ============ 3. 业务闭环（patient11 无历史挂号）============
  console.log('=== 3. 业务闭环 ===');

  const sch = await call('GET', '/schedules?doctorId=doc01', { token: tPatient });
  const scheduleId = sch.data?.data?.[0]?.id;
  check('患者查询排班号源成功', !!scheduleId, JSON.stringify(sch.data));

  const reg = await call('POST', '/registrations', { token: tPatient, body: { schedule_id: scheduleId } });
  const regId = reg.data?.data?.id;
  check('挂号成功(201)', reg.status === 201 && !!regId, JSON.stringify(reg.data));

  const dupReg = await call('POST', '/registrations', { token: tPatient, body: { schedule_id: scheduleId } });
  check('重复挂号返回 400', dupReg.status === 400);

  const accept = await call('POST', `/doctor/registrations/${regId}/accept`, {
    token: tDoctor, body: { chief_complaint: '咳嗽三天', diagnosis: '支气管炎' },
  });
  check('医生接诊成功(WAITING->CONSULTING)', accept.status === 200, JSON.stringify(accept.data));

  const rx = await call('POST', '/doctor/prescriptions', {
    token: tDoctor,
    body: { registration_id: regId, items: [{ drug_id: 'drug05', quantity: 2, dosage: '一日一次' }, { drug_id: 'drug06', quantity: 1, dosage: '一日一次' }] },
  });
  const rxId = rx.data?.data?.id;
  check('开处方成功(CONSULTING->COMPLETED)', rx.status === 201 && !!rxId, JSON.stringify(rx.data));

  const dupRx = await call('POST', '/doctor/prescriptions', {
    token: tDoctor,
    body: { registration_id: regId, items: [{ drug_id: 'drug05', quantity: 1 }] },
  });
  check('同一挂号单重复开方返回 400', dupRx.status === 400);

  const pay = await call('POST', '/cashier/payments', { token: tCashier, body: { prescription_id: rxId } });
  check('收费成功(PENDING->PAID)', pay.status === 201, JSON.stringify(pay.data));
  const payAmount = pay.data?.data?.amount;
  check('收费金额=处方总额(后端计算)', payAmount === 8.5 * 2 + 6.0, `amount=${payAmount}`);

  const dispense = await call('POST', `/pharmacist/prescriptions/${rxId}/dispense`, { token: tPharmacist });
  check('发药成功(PAID->DISPENSED)', dispense.status === 200, JSON.stringify(dispense.data));

  const rxCheck = await call('GET', `/prescriptions/${rxId}`, { token: tPatient });
  check('患者查询处方状态=DISPENSED', rxCheck.data?.data?.status === 'DISPENSED');

  // ============ 4. 越权（RBAC）============
  console.log('=== 4. 越权（RBAC）===');

  check('患者访问医生接口返回 403', (await call('GET', '/doctor/registrations', { token: tPatient })).status === 403);
  check('患者访问收费接口返回 403', (await call('GET', '/cashier/prescriptions', { token: tPatient })).status === 403);
  check('患者访问药师接口返回 403', (await call('GET', '/pharmacist/prescriptions', { token: tPatient })).status === 403);
  check('患者访问管理端返回 403', (await call('GET', '/admin/users', { token: tPatient })).status === 403);
  check('医生访问收费接口返回 403', (await call('GET', '/cashier/prescriptions', { token: tDoctor })).status === 403);
  check('医生访问管理端返回 403', (await call('GET', '/admin/drugs', { token: tDoctor })).status === 403);
  check('收费员访问医生接口返回 403', (await call('GET', '/doctor/registrations', { token: tCashier })).status === 403);
  check('收费员访问药师接口返回 403', (await call('GET', '/pharmacist/prescriptions', { token: tCashier })).status === 403);
  check('药师访问收费接口返回 403', (await call('GET', '/cashier/prescriptions', { token: tPharmacist })).status === 403);
  check('管理员访问患者挂号接口返回 403', (await call('GET', '/registrations', { token: tAdmin })).status === 403);
  check('管理员访问医生接口返回 403', (await call('GET', '/doctor/registrations', { token: tAdmin })).status === 403);
  check('无 Token 访问管理端返回 401', (await call('GET', '/admin/users')).status === 401);

  // ============ 5. 资源级越权 ============
  console.log('=== 5. 资源级越权 ===');

  const otherPatient = await login('patient12', 'patient123');
  const otherReg = await call('GET', `/registrations/${regId}`, { token: otherPatient });
  check('患者访问他人挂号单返回 403', otherReg.status === 403);

  const tDoctor2 = await login('doctor2', 'doctor123');
  const otherDocAccept = await call('POST', `/doctor/registrations/${regId}/accept`, {
    token: tDoctor2, body: { chief_complaint: 'x', diagnosis: 'y' },
  });
  check('医生访问他人挂号单返回 403', otherDocAccept.status === 403);

  const otherRx = await call('GET', `/prescriptions/${rxId}`, { token: otherPatient });
  check('患者访问他人处方返回 403', otherRx.status === 403);

  const patientDrugs = await call('GET', '/drugs', { token: tPatient });
  check('患者访问药品目录返回 403(仅医生/药师)', patientDrugs.status === 403);

  // ============ 6. 取消挂号回补号源 ============
  console.log('=== 6. 取消挂号回补号源 ===');

  const sch2 = await call('GET', '/schedules?doctorId=doc02', { token: otherPatient });
  const scheduleId2 = sch2.data?.data?.[0]?.id;
  const before = sch2.data?.data?.[0]?.remaining_num;
  const reg2 = await call('POST', '/registrations', { token: otherPatient, body: { schedule_id: scheduleId2 } });
  const reg2Id = reg2.data?.data?.id;
  const afterReg = (await call('GET', '/schedules?doctorId=doc02', { token: otherPatient })).data?.data?.[0]?.remaining_num;
  check('挂号后号源减一', before - afterReg === 1, `before=${before} after=${afterReg}`);

  const cancel = await call('POST', `/registrations/${reg2Id}/cancel`, { token: otherPatient });
  check('取消挂号成功', cancel.status === 200);
  const afterCancel = (await call('GET', '/schedules?doctorId=doc02', { token: otherPatient })).data?.data?.[0]?.remaining_num;
  check('取消后号源回补', afterCancel === before, `before=${before} afterCancel=${afterCancel}`);

  // ============ 7. 管理端 CRUD ============
  console.log('=== 7. 管理端 CRUD ===');

  const dept = await call('POST', '/admin/departments', { token: tAdmin, body: { name: '测试科室X', location: '3楼' } });
  const deptId = dept.data?.data?.id;
  check('管理员创建科室成功(201)', dept.status === 201 && !!deptId, JSON.stringify(dept.data));

  const dupDept = await call('POST', '/admin/departments', { token: tAdmin, body: { name: '测试科室X' } });
  check('重复科室名返回 400', dupDept.status === 400);

  const updDept = await call('PUT', `/admin/departments/${deptId}`, { token: tAdmin, body: { location: '4楼' } });
  check('管理员更新科室成功', updDept.status === 200);

  const delDept = await call('DELETE', `/admin/departments/${deptId}`, { token: tAdmin });
  check('管理员删除科室成功', delDept.status === 200);

  const drug = await call('POST', '/admin/drugs', { token: tAdmin, body: { name: '测试药', price: 9.9, stock: 10 } });
  const drugId = drug.data?.data?.id;
  check('管理员创建药品成功(201)', drug.status === 201 && !!drugId);

  const badDrug = await call('POST', '/admin/drugs', { token: tAdmin, body: { name: '坏药', price: -1 } });
  check('药品负价格返回 400', badDrug.status === 400);

  const delDrug = await call('DELETE', `/admin/drugs/${drugId}`, { token: tAdmin });
  check('管理员删除药品成功', delDrug.status === 200);

  // ============ 汇总 ============
  console.log('\n============ 测试汇总 ============');
  console.log(`通过: ${passed}  失败: ${failed}  总数: ${passed + failed}`);
  results.forEach((r) => console.log(r));
  console.log('\n完整结果已输出。');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('测试脚本异常:', e); process.exit(2); });
