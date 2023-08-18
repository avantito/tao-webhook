import { format } from "date-fns";
import set from "lodash.set";
import { WordpressPayload } from "./types";
import * as fs from "fs";
import path from "path";

const keyMap = {
  id: "fields.contentful_id",
  name: "fields.event_title.display_title",
  venue: "fields.event_venue",
  startTime: "fields.event_start_date",
  endTime: "fields.event_end_date",
  description: "fields.event_description",
  cta1Title: "fields.links[0].link.title",
  cta1Link: "fields.links[0].link.url",
  cta1LinkTargetExternal: "fields.links[0].link.target",
  cta2Title: "fields.links[1].link.title",
  cta2Link: "fields.links[1].link.url",
  cta2LinkTargetExternal: "fields.links[1].link.target",
};

function getTimezoneOffset(dateString: string) {
  const regex = /([-+])(\d{2}):(\d{2})$/;
  const match = dateString.match(regex);
  if (match) {
    const operator = match[1];
    const hours = parseInt(match[2], 10);
    return `${operator}${hours}`;
  }
  return "-5";
}

export function getNormalizedContenful(payload: any): WordpressPayload {
  const normalized = {};
  Object.keys(keyMap)?.forEach((key: any) => {
    switch (key) {
      case "id":
        // @ts-ignore
        set(normalized, keyMap[key] as string, payload.sys.id);
        break;
      case "name":
        // @ts-ignore
        set(normalized, keyMap[key] as string, payload.fields["id"]?.["en-US"]);
        break;
      case "carouselImage":
        set(
          normalized,
          // @ts-ignore
          keyMap[key] as string,
          payload.fields[key]?.["en-US"].sys.id
        );
        break;
      case "venue":
        set(
          normalized,
          // @ts-ignore
          keyMap[key] as string,
          payload.fields[key]?.["en-US"].sys.id
        );
        break;
      case "startTime":
        const startDate = format(
          new Date(payload.fields[key]?.["en-US"]),
          "M/d/yyyy h:mm a"
        );
        const timezone = getTimezoneOffset(payload.fields[key]?.["en-US"]);
        set(
          normalized,
          // @ts-ignore
          keyMap[key] as string,
          startDate
        );
        set(
          normalized,
          // @ts-ignore
          "fields.time_zone",
          timezone
        );
        break;
      case "endTime":
        const endDate = format(
          new Date(payload.fields[key]?.["en-US"]),
          "M/d/yyyy h:mm a"
        );
        set(
          normalized,
          // @ts-ignore
          keyMap[key] as string,
          endDate
        );
        break;
      default:
        // @ts-ignore
        set(normalized, keyMap[key] as string, payload.fields[key]?.["en-US"]);
    }
  });
  return normalized as WordpressPayload;
}

export async function deleteAllFilesInDirectory(
  directoryPath: string
): Promise<void> {
  const files = await fs.promises.readdir(directoryPath);
  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    await fs.promises.unlink(filePath);
  }
}

export function imagePayload(artist: string, venue: string, startTime: string) {
  return {
    title: `Artist Image - ${artist}`,
    alt_text: `Artist Image - ${artist}`,
    caption: `${startTime} - ${artist} - ${venue}`,
    description: `${startTime} - ${artist} - ${venue}`,
  };
}

function containsLasVegas(sentence: string): boolean {
  const regex = /las[-_ ]?vegas/i;
  return regex.test(sentence);
}

export function getNormalizedVariables({
  wordpressPayload,
  entry,
}: {
  wordpressPayload: WordpressPayload;
  entry: any;
}) {
  const startDate = wordpressPayload.fields.event_start_date.split(" ")[0];
  const artist = entry?.fields?.artist || "Unknown Artist";
  const venue = (entry?.fields?.venue as any)?.fields;
  const venueName = venue?.name;
  const venueSlug = venue?.storeId?.toLowerCase();
  const carouselImage = (entry?.fields?.carouselImage as any)?.fields;
  const imgUrl = `https:${carouselImage?.file?.url}`;
  return {
    startDate,
    artist,
    venueName,
    venueSlug,
    isVegasVenue: containsLasVegas(venueName),
    imgUrl,
  };
}
