const { fail } = require('../utils/response');

const notFound = (req, res) => fail(res, '接口不存在', 404);

const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err);
  fail(res, '服务器内部错误', 500);
};

module.exports = { notFound, errorHandler };
