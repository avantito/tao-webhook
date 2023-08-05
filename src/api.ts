import WPAPI from "wpapi";

var wp = new WPAPI({
  endpoint: process.env.WPAPI_ENDPOINT || "",
  username: process.env.WPAPI_USERNAME || "",
  password: process.env.WPAPI_PASSWORD || "",
});
var namespace = "wp/v2"; // use the WP API namespace

var eventRoute = "/events/(?P<id>)"; // route string - allows optional ID parameter

var venuesRoute = "/venues/(?P<id>)"; // route string - allows optional ID parameter

// wpapi = an instance of `node-wpapi`
wp.events = wp.registerRoute(namespace, eventRoute, {
  params: ["filter"],
});
wp.venues = wp.registerRoute(namespace, venuesRoute, {
  params: ["filter"],
});

export default wp;
