declare module "express" {
  import http = require("http");
  function express(): any;
  namespace express {}
  export = express;
}

declare module "express-serve-static-core" {
  interface Request extends http.IncomingMessage {}
  interface Response extends http.ServerResponse {}
}
