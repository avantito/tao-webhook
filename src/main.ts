require("dotenv").config();

/*
  STOP :: BE ADDING TO THE LIVE SITE FIRST YOU MUST:

  1. Update User In WP
  Wordpress Application Password for tao-group User
  under Users -> tao-group -> Application Passwords

  2. Update .htaccess file to Allow HTTP Authentication
  
  First install: WP Htaccess Editor
  https://wordpress.org/plugins/wp-htaccess-editor/

  # Enable HTTP Auth
  RewriteCond %{HTTP:Authorization} ^(.*)
  RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]

  3. Add the necessary fields to ACF
  Events -> Contentful ID -> contentful_id

  4. ALL Contentful VENUE STORE_IDs must match corresponding Wordpress VENUE SLUGs
*/

import download from "image-downloader";
import path from "path";
import {
  deleteAllFilesInDirectory,
  getNormalizedContenful,
  getNormalizedVariables,
  imagePayload,
} from "./utils";
import { webhook } from "./listener";
import api from "./api";
import { client } from "./contentful";

const IMAGE_DIRECTORY = path.resolve(__dirname, "images");

const { log } = console;

webhook.on("publish", async function (payload: any) {
  // Kickoff the process
  log("Incoming Payload ======================");

  if (payload.contentType === "event") {
    const wordpressPayload = getNormalizedContenful(payload);

    log("Refetching Event from Contentful ======================");
    const entry = await client.getEntry(wordpressPayload.fields.contentful_id);

    const { startDate, artist, venueName, venueSlug, imgUrl } =
      getNormalizedVariables({ wordpressPayload, entry });

    try {
      log("Retrieving Venue From Wordpress ======================");
      let wpVenue = await api.venues().slug(venueSlug);
      wordpressPayload.fields.event_venue = wpVenue[0].id;

      log(
        `Creating "${startDate} - ${artist} - ${venueName}" in Wordpress ======================`
      );
      let result = await api.events().create({
        title: `${startDate} - ${artist} - ${venueName}`,
        status: "publish",
        ...wordpressPayload,
      });

      log(
        `Downloading Image from Contentful: ${imgUrl} ======================`
      );
      const { filename } = await download.image({
        url: imgUrl,
        dest: IMAGE_DIRECTORY,
      });

      log(`Downloading ${filename} ======================`);
      const image = await api
        .media()
        .file(filename)
        .create(imagePayload(artist as string, venueName, startDate));

      log(
        `Associating Image: ${image.id} with Post: ${result.id} ======================`
      );
      await api.events().id(result.id).update({
        featured_media: image.id,
      });

      log(`Deleting ${filename} ======================`);
      await deleteAllFilesInDirectory(IMAGE_DIRECTORY);

      log(`Done ======================`);
    } catch (e) {
      console.log("Something Went Wrong", e);
    }
  }
});

webhook.listen(3000);
