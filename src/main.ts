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
  let result;

  if (payload?.contentType === "event") {
    // Convert Contenful to Wordpress Payload
    const wordpressPayload = getNormalizedContenful(payload);

    log("Refetching Full Event Data from Contentful ======================");
    const entry = await client.getEntry(wordpressPayload.fields.contentful_id);

    const [existingEvent] = await api.events().filter({
      meta_key: "contentful_id",
      meta_value: wordpressPayload.fields.contentful_id,
    });

    // Give us some variables to work with
    const { startDate, artist, venueName, venueSlug, isVegasVenue, imgUrl } =
      getNormalizedVariables({ wordpressPayload, entry });

    if (isVegasVenue) {
      log("Skipping Las Vegas Venue ======================");
      return;
    }

    try {
      if (venueSlug) {
        log("Retrieving Venue From Wordpress ======================");
        const wpVenue = await api.venues().slug(venueSlug);
        wpVenue.length &&
          (wordpressPayload.fields.event_venue = wpVenue[0]?.id);
      }

      if (existingEvent) {
        log("Event Already Exists ======================");
        result = await api
          .events()
          .id(existingEvent.id)
          .update({
            title: `${startDate} - ${artist} - ${venueName}`,
            status: "publish",
            ...wordpressPayload,
          });
      } else {
        log(
          `Creating "${startDate} - ${artist} - ${venueName}" in Wordpress ======================`
        );
        result = await api.events().create({
          title: `${startDate} - ${artist} - ${venueName}`,
          status: "publish",
          ...wordpressPayload,
        });
      }

      if (imgUrl) {
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
      }

      log(`Done ======================`);
    } catch (e) {
      console.log("Something Went Wrong", e);
    }
  }
});

webhook.listen(process.env.PORT || 3000, () => {
  log(`Listening on port ${process.env.PORT || 3000}! Most Recent Version`);
});
