function problemDetail(res, config){
  // Config is an object, contains the fields from RFC 7807 (detail, type, title, status, instance)
  res.set('Content-Type', 'application/problem+json')
  const statusCode = config.status
  res.status(statusCode).json(config)
}

exports.problemDetail = problemDetail
