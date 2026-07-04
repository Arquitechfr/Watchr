process.env.NODE_ENV = "test";
process.env.PORT = "4500";
process.env.MONGO_URI = "mongodb://[REDACTED_MONGO_URI]";
process.env.REDIS_HOST = "[REDACTED_IP]";
process.env.REDIS_PORT = "6379";
process.env.REDIS_PASSWORD = "[REDACTED_REDIS_PASSWORD]";
process.env.JWT_ACCESS_SECRET = "test_access_secret";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
process.env.TMDB_API_KEY = "test_tmdb_key";
process.env.TVDB_API_KEY = "test_tvdb_key";
process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
  type: "service_account",
  project_id: "watchr-test",
  private_key_id: "test-key-id",
  private_key: "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAxYNwwRuhHsCDCTGDSUVH5mNAszhsgo4B1vSfBg9znVST9Id6\nn77oh/UG/flmtsil1AqJw2H7ZDL+RVp4p1zE2cdXbnoVb2OD16zh5gEu+PdovPOj\nDft/fVKh/Mj6MiiCj1tzqizn9g3LTr+Ks0fkwDL7xL9r+Yp/tYxldccRPiFn8oMm\nJ6e+wzX9rdUpLiJnFirolNegZyvoDcDtwA252Mwguee9C+PN6HgLqI2ysgt0Zvv3\nvfZKbWQcZioS2lp5QQDcvKAu/oFNE7y7DnpyC/UNI2yRSBQYZVhZq1H14936t3RI\n+CULTSKmU1w/Qw68hs2bbltPvuWfXqoNqRUDiQIDAQABAoIBAAhVpxTnAxIGoqDp\nL3aQj1un9Yt6ho2ty2MUOH+reD/72TB45RJHno1aKBzggNaWufSsKysM/+w3AKbR\njgTV89KSyFw3l573LpGT0IaBp0dHPWq3xzooUjVqHr7JhlFGh1fgTo2wTmuCIoGk\nsIgnMP5xSFGBmF9T2lbBYWiqaU5bTGha50NUP++9TWNP59A3RhMWDQtTafQetTc2\nPSeJ740TolACmcP6Wx5ZuT0c36fO5Hkj9DL38+qOzGtVGWlxAl9OMQfQls6VUcPk\nG92wyqO4DTKyPg/z2+1hyAEg8J7fp0ShuKELBJ2na0gH29aP+6/XAl3MRd752JHa\npO3//0ECgYEA/UzTncg+mTdBDQZZgXbfde1t/y3k2c4jBwGoO53GW0hsF+TT1ONT\nWV0GkSgLXDFC46sfJ15APxHQlOlB3yg1akahuni8zPyUPOwlUsOJrn2/VBDFCd7L\n3TkUTZNkKlkOvwf1VXNCPA5sJnVE/c3hbgi2zrdEYkpQYZz4tCP9xpECgYEAx55j\n5IzQkW/i4JU4QNBiziJ6V6nVW/R6YlPXfkT73vTLqAm2G9neh0VWNWoM+048e3Cc\nTuB182138h2PILcmmmeBNuhThOPgKepqNbjl5xnhB6Qh4aXsFvTAVPQn86RVTnNf\ni9EyFJA3gCZf15DfJ7jx5Eq5dp6ujf7cdezeGXkCgYBz310+5IeeV2RurOTtEJAQ\nxlh3T2tNJ7tmTR/EhdxjjbHFDGzLCmLqkl+ar5LizbYnp/RMchU5xNCCDmKPzzkA\nMOdzAiB8NV8qr2wzfDfTlrqbnkBEz6K6xI3BHxfHN45DXUShnmRCTOa0gRjacgAZ\n8eqOjc++lvhGbyRmY8CHwQKBgGd7LqGudfjPHbf64xyGapIdwXpsalSvGjqa6B1n\nOYLNOD42OpeZjAhn41bxUSV921DKgd1J8xtsZj+3HxmAmJx2h7+lFJbRYsWX5dNP\ntK7m9Yb2iTHmx8rmukXQBF4DlM2EdcWPfvy1/m+KdSjUyzpWX99O9XIOtMKbmkHv\ntvtRAoGBAOUdHcWnwCPb+kINX09IYsLbwOzxbFHa3Jnmf5kykFsonqSUfbucQJ/P\nJDUPfGjE4ioz9hr/QqfTRH/v9pI8EXeUHQTu9mSXzj4xlpQiFKF2/K5G72e9Ar7R\np6IB4UjZBUew+4pog/VslRaNuoKovPOR9El6j6+zz2IUi+21xVUT\n-----END RSA PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk@test.watchr.iam.gserviceaccount.com",
  client_id: "123456789",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40test.watchr.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
});
