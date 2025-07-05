# Omakase Reference Player

The Omakase Reference Player is an application focused on a QC use case that showcases the main capabilities of the [Omakase Player](https://player.byomakase.org/).

# Development server

1. Execute the following commands to install dependencies and start development server:

```bash
npm install
ng serve --port 3000
```

2. Navigate to [http://localhost:3000/?session=http://localhost:3000/demo-assets/meridian/meridian_en_720p24.json](http://localhost:3000/?session=http://localhost:3000/demo-assets/meridian/meridian_en_720p24.json)
   to open the application in development mode with the default demo session file.

![Alt text](screenshot.png)

The application will automatically reload if you change any of the source files.

In development mode, the `/demo-assets` directory is served in development server root and `http://localhost:3000/demo-assets/` is the root location for demo files.

Please note that the media and thumbnails for the demo are served from https://github-media.assets.byomakase.org, but the
session file, waveform tracks and analysis tracks it references are served from the development server root at `/demo-assets`.

# Configuration guide

Application requires a JSON configuration file to be passed as a `session` query parameter in the URL.

The configuration file describes the media that is presented in the player as well as the layout of the timeline (see the default demo example).

The JSON configuration file must correspond to structure defined in `src/app/model/domain.model.ts`:

```ts
export interface SessionData {
   version: string;
   session?: {
      id?: string;
      next?: string;
      previous?: string;
      status?: string;
      services?: {
         media_authentication?: AuthenticationData;
      };
   };
   media: {
      main: MainMedia[];
      sidecars: SidecarEntry[];
   };
   data: {
      media_tracks: MediaTracks;
   };
   sources?: Source[];
   presentation?: Presentation;
}
```

## Build

Run `ng build --configuration=dev --localize=false --base-href=/` to build the project. The build artifacts will be stored in the `dist/` directory.

## Links

- Omakase Player Web: [https://player.byomakase.org/](https://player.byomakase.org/)
- Omakase Player GitHub: [https://github.com/byomakase/omakase-player](https://github.com/byomakase/omakase-player)
- Omakase Media Tools GitHub: [https://github.com/byomakase/omakase-media-tools](https://github.com/byomakase/omakase-media-tools)

## Further help

CORS must be taken into account if the configuration file is served from different domain than server running the Omakase Reference Player



