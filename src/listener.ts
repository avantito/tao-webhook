// @ts-ignore
import listener from "contentful-webhook-listener";

export const webhook = listener.createServer({}, function requestListener() {
  console.log("Incoming Request ====================================");
});
