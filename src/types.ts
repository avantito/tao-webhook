export type WordpressPayload = {
  fields: {
    contentful_id: string;
    event_title: { display_title: string };
    event_venue: string;
    event_start_date: string;
    timezone: string;
    event_end_date: string;
    event_description: string;
    links: { [key: string]: any }[];
  };
  featured_media: string;
};
