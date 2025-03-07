/*
 * Copyright 2024 ByOmakase, LLC (https://byomakase.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  AudioTrackLaneStyle,
  BarChartLaneStyle,
  ConfigWithOptionalStyle,
  LabelLaneStyle,
  LineChartLaneStyle,
  MomentMarkerStyle,
  OgChartLaneStyle,
  OmakasePlayerConfig,
  PeriodMarkerStyle,
  ScrubberLaneStyle,
  SubtitlesLaneStyle,
  TextLabelStyle,
  ThumbnailLaneStyle,
  TimelineConfig,
  TimelineLaneStyle,
  Video,
  VideoLoadOptions,
} from '@byomakase/omakase-player';

export class Constants {
  static VARIABLES = {
    text: {
      fontFamily: `"Nunito Sans", sans-serif`,
      fontStyle: '400',
    },

    timelineLaneMarginBottom: 1,
  };

  static OMAKASE_PLAYER_COMMON_CONFIG: Partial<OmakasePlayerConfig> = {
    hlsConfig: {
      debug: false,
      fragLoadPolicy: {
        default: {
          maxTimeToFirstByteMs: 30000,
          maxLoadTimeMs: 60000,
          timeoutRetry: {
            maxNumRetry: 4,
            retryDelayMs: 0,
            maxRetryDelayMs: 0,
          },
          errorRetry: {
            maxNumRetry: 6,
            retryDelayMs: 3000,
            maxRetryDelayMs: 8000,
          },
        },
      },
      maxMaxBufferLength: 30,
      fetchManifestSubtitleTracks: true,
    },
  };

  static OMAKASE_PLAYER_CONFIG: Partial<OmakasePlayerConfig> = {
    ...this.OMAKASE_PLAYER_COMMON_CONFIG,
    detachedPlayerUrlFn: (video: Video, videoLoadOptions?: VideoLoadOptions) => '/detached',
  };

  static OMAKASE_PLAYER_DETACHED_CONFIG: Partial<OmakasePlayerConfig> = {
    ...this.OMAKASE_PLAYER_COMMON_CONFIG,
    detachedPlayer: true,
  };

  static TIMELINE_CONFIG: Partial<ConfigWithOptionalStyle<TimelineConfig>> = {
    // zoom,
    zoomWheelEnabled: false,

    playheadDragScrollMaxSpeedAfterPx: 20,

    scrubberClickSeek: false,

    style: {
      textFontFamily: this.VARIABLES.text.fontFamily,
      textFontStyle: this.VARIABLES.text.fontStyle,

      backgroundOpacity: 1,

      headerHeight: 18,
      headerMarginBottom: 1,
      headerBackgroundOpacity: 1,

      footerHeight: 50,
      footerMarginTop: 1,
      footerBackgroundOpacity: 0.6,

      leftPaneWidth: 235,
      rightPaneMarginLeft: 20,
      rightPaneMarginRight: 20,
      rightPaneClipPadding: 20,

      // scrollbar
      scrollbarHeight: 15,
      scrollbarBackgroundFillOpacity: 0.3,
      scrollbarHandleBarOpacity: 0.7,
      scrollbarHandleOpacity: 1,

      // playhead
      playheadBufferedOpacity: 1,
      playheadBackgroundOpacity: 1,
      playheadTextYOffset: -14,

      playheadLineWidth: 2,
      playheadSymbolHeight: 12,
      playheadScrubberHeight: 9,

      playheadPlayProgressOpacity: 1,

      // playhead hover
      scrubberSymbolHeight: 12,
      scrubberTextYOffset: -14,
      scrubberTextFontSize: 12,

      scrubberMarginBottom: this.VARIABLES.timelineLaneMarginBottom,
    },
  };

  static TIMELINE_LANE_STYLE: Partial<TimelineLaneStyle> = {
    // rightBackgroundOpacity: 0.1,
    marginBottom: this.VARIABLES.timelineLaneMarginBottom,

    descriptionTextFontSize: 13,
  };

  static THUMBNAIL_LANE_STYLE: Partial<ThumbnailLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 69,
    thumbnailHeight: 69,
  };

  static MARKER_LANE_STYLE: Partial<TimelineLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 36,
  };

  static PERIOD_MARKER_STYLE: Partial<PeriodMarkerStyle> = {
    symbolType: 'none',
    symbolSize: 15,
    selectedAreaOpacity: 0,
    lineOpacity: 0,
    markerHandleAreaOpacity: 1,
  };

  static MOMENT_MARKER_STYLE: Partial<MomentMarkerStyle> = {
    symbolType: 'square',
    symbolSize: 16,
    lineOpacity: 0,
  };

  static SCRUBBER_LANE_STYLE: Partial<ScrubberLaneStyle> = {};

  static LABEL_LANE_STYLE: Partial<LabelLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    rightBackgroundOpacity: 0.8,
    textFontSize: 15,
    textFontStyle: '400',
    textAreaStretch: false, // we just want text as link, not entire label lane area
    descriptionTextYOffset: -2,
    height: 36,
  };

  static LABEL_LANE_STYLE_ACTIVE: Partial<LabelLaneStyle> = {
    rightBackgroundOpacity: 1,
  };

  static CUSTOM_AUDIO_TRACK_LANE_STYLE: Partial<AudioTrackLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 40,
  };

  static LINE_CHART_LANE_STYLE: Partial<LineChartLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    pointWidth: 5,
    lineStrokeWidth: 2,
    paddingTop: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    paddingBottom: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    height: 100,
  };

  static BAR_CHART_LANE_STYLE: Partial<BarChartLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    paddingTop: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    paddingBottom: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    height: 100,
    interpolationWidth: 10,
    itemCornerRadius: 10,
    itemPadding: 4,
  };

  static OG_CHART_LANE_STYLE: Partial<OgChartLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    paddingTop: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    paddingBottom: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    height: 100,
    interpolationWidth: 10,
    itemPadding: 4,
  };

  static SUBTITLES_LANE_STYLE: Partial<SubtitlesLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 40,
    subtitlesLaneItemOpacity: 1,
    paddingTop: 7,
    paddingBottom: 7,
  };

  static TEXT_LABEL_STYLE: Partial<TextLabelStyle> = {
    fontFamily: this.VARIABLES.text.fontFamily,
    fontSize: 13,
    align: 'left',
    verticalAlign: 'middle',
    offsetY: -2,
  };

  static TEXT_LABEL_STYLE_2: Partial<TextLabelStyle> = {
    ...this.TEXT_LABEL_STYLE,
  };

  static TEXT_LABEL_BUTTON_STYLE: Partial<TextLabelStyle> = {
    fontFamily: this.VARIABLES.text.fontFamily,
    fontSize: 13,
    align: 'center',
    verticalAlign: 'middle',
    backgroundBorderRadius: 2,
    offsetY: -2,
  };

  static SOUND_LABEL_BUTTON_STYLE: Partial<TextLabelStyle> = {
    ...this.TEXT_LABEL_BUTTON_STYLE,
    backgroundBorderRadius: [0, 2, 2, 0],
  };

  static TEXT_LABEL_BUTTON_ACTIVE_STYLE: Partial<TextLabelStyle> = {
    ...this.TEXT_LABEL_BUTTON_STYLE,
  };

  static SOUND_LABEL_BUTTON_ACTIVE_STYLE: Partial<TextLabelStyle> = {
    ...this.SOUND_LABEL_BUTTON_STYLE,
  };

  static TEXT_LABEL_BUTTON_DISABLED_STYLE: Partial<TextLabelStyle> = {
    ...this.TEXT_LABEL_BUTTON_STYLE,
  };
}
