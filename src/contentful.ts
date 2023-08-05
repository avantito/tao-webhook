import * as contentful from "contentful";

export const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID || "",
  environment: process.env.NODE_ENV || "development",
  accessToken: process.env.CONTENTFUL_ACCESS_ID || "",
});
