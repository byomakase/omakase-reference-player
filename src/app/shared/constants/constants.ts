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
  OgChartLaneStyle,
  OmakasePlayerConfig,
  PeriodMarkerStyle,
  ScrubberLaneStyle,
  SubtitlesLaneStyle,
  TextLabelStyle,
  ThumbnailLaneStyle,
  TimelineConfig,
  TimelineLaneStyle,
} from '@byomakase/omakase-player';

export class Constants {
  static IMAGES_ROOT = '/assets/images/timeline';

  static IMAGE_BUTTONS = {
    circleMinus: {
      src: `${Constants.IMAGES_ROOT}/icon-circle-minus.svg`,
      width: 42,
      height: 42,
    },
    circlePlus: {
      src: `${Constants.IMAGES_ROOT}/icon-circle-plus.svg`,
      width: 42,
      height: 42,
    },
    chevronDown: {
      src: `${Constants.IMAGES_ROOT}/icon-chevron-down.svg`,
      width: 20,
      height: 20,
    },
    chevronRight: {
      src: `${Constants.IMAGES_ROOT}/icon-chevron-right.svg`,
      width: 20,
      height: 20,
    },
    telemetryActive: {
      src: `${Constants.IMAGES_ROOT}/icon-telemetry-active.svg`,
      width: 20,
      height: 20,
    },
    telemetryInactive: {
      src: `${Constants.IMAGES_ROOT}/icon-telemetry-inactive.svg`,
      width: 20,
      height: 20,
    },
    telemetryDisabled: {
      src: `${Constants.IMAGES_ROOT}/icon-telemetry-disabled.svg`,
      width: 20,
      height: 20,
    },
    config: {
      src: `${Constants.IMAGES_ROOT}/icon-gear.svg`,
      width: 20,
      height: 20,
    },
  };

  static VARIABLES = {
    text: {
      fontFamily: `"Nunito Sans", sans-serif`,
      fontStyle: '400',
      fill: '#FFFFFF',
    },

    entitiesColors: ['#989BFF', '#43F4FF', '#B2BAD6', '#D69D9D', '#FFE790', '#9ED78D', '#A3D7E2', '#C993F3', '#FF8E9C', '#FFD1C2', '#F58428', '#D3D3D3', '#F1FFBB'],

    lineColors: ['#C306E2', '#1079DA', '#37E03E', '#F54A4A', '#F9D726', '#CECECE'],

    segmentationColors: ['#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2', '#FFBB79', '#F57F65', '#D69D9D', '#E335FF', '#316BFF', '#15EBAB', '#EEFF2F', '#FF8E21', '#FF3306', '#FF7272'],

    timelineLaneMarginBottom: 1,

    audioTrackLaneFillGradientColorStops: [0, '#747DAF', 0.33, '#8D8BB0', 0.5, '#A499B1', 0.59, '#C2AAB1', 0.78, '#D5B5B2', 0.93, '#E2BDB2', 1, '#F3C6B3'],
  };

  static COLORS = {
    blue: '#00A3E9',
    white: '#FFFFFF',
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
    },
  };

  static OMAKASE_PLAYER_CONFIG: Partial<OmakasePlayerConfig> = {
    ...this.OMAKASE_PLAYER_COMMON_CONFIG,
    detachedPlayerUrl: '/detached',
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
      textFontFamily: Constants.VARIABLES.text.fontFamily,
      textFontStyle: Constants.VARIABLES.text.fontStyle,

      backgroundFill: '#353644',
      backgroundOpacity: 1,

      headerHeight: 18,
      headerMarginBottom: 1,
      headerBackgroundFill: '#292D43',
      headerBackgroundOpacity: 1,

      footerHeight: 50,
      footerMarginTop: 1,
      footerBackgroundFill: '#353644',
      footerBackgroundOpacity: 0.6,

      leftPaneWidth: 235,
      rightPaneMarginLeft: 20,
      rightPaneMarginRight: 20,
      rightPaneClipPadding: 20,

      // scrollbar
      scrollbarHeight: 15,
      scrollbarBackgroundFill: '#2839D4',
      scrollbarBackgroundFillOpacity: 0.3,
      scrollbarHandleBarFill: '#3A4CF4',
      scrollbarHandleBarOpacity: 0.7,
      scrollbarHandleOpacity: 1,

      // playhead
      playheadFill: '#43F4FF',
      playheadBufferedFill: '#989BFF',
      playheadBufferedOpacity: 1,
      playheadBackgroundFill: '#83899E',
      playheadBackgroundOpacity: 1,
      playheadTextYOffset: -14,
      playheadTextFill: 'transparent',

      playheadLineWidth: 2,
      playheadSymbolHeight: 12,
      playheadScrubberHeight: 9,

      playheadPlayProgressFill: '#3E44FE',
      playheadPlayProgressOpacity: 1,

      // playhead hover
      scrubberFill: '#B2BAD6',
      scrubberSnappedFill: '#9ED78D',
      scrubberSymbolHeight: 12,
      scrubberTextYOffset: -14,
      scrubberTextFontSize: 12,

      scrubberMarginBottom: Constants.VARIABLES.timelineLaneMarginBottom,
    },
  };

  static TIMELINE_LANE_STYLE: Partial<TimelineLaneStyle> = {
    backgroundFill: '#292D43',
    rightBackgroundFill: '#454857',
    // rightBackgroundOpacity: 0.1,
    descriptionTextFill: Constants.VARIABLES.text.fill,
    marginBottom: Constants.VARIABLES.timelineLaneMarginBottom,

    descriptionTextFontSize: 13,
  };

  static THUMBNAIL_LANE_STYLE: Partial<ThumbnailLaneStyle> = {
    ...Constants.TIMELINE_LANE_STYLE,
    height: 69,
    thumbnailHeight: 69,
  };

  static MARKER_LANE_STYLE: Partial<TimelineLaneStyle> = {
    ...Constants.TIMELINE_LANE_STYLE,
    height: 36,
  };

  static PERIOD_MARKER_STYLE: Partial<PeriodMarkerStyle> = {
    symbolType: 'none',
    symbolSize: 15,
    selectedAreaOpacity: 0,
    lineOpacity: 0,
    markerHandleAreaOpacity: 1,
  };

  static MOMENT_MARKER_STYLE: Partial<PeriodMarkerStyle> = {
    symbolType: 'square',
    symbolSize: 16,
    lineOpacity: 0,
  };

  static SCRUBBER_LANE_STYLE: Partial<ScrubberLaneStyle> = {
    backgroundFill: '#3A3D4B',
    leftBackgroundFill: Constants.TIMELINE_LANE_STYLE.backgroundFill,
    rightBackgroundFill: '#3A3D4B',

    tickFill: Constants.VARIABLES.text.fill,

    timecodeFill: Constants.VARIABLES.text.fill,

    descriptionTextFill: Constants.VARIABLES.text.fill,
  };

  static LABEL_LANE_STYLE: Partial<LabelLaneStyle> = {
    ...Constants.TIMELINE_LANE_STYLE,
    rightBackgroundFill: '#525979',
    rightBackgroundOpacity: 0.8,
    textFill: Constants.VARIABLES.text.fill,
    textFontSize: 15,
    textFontStyle: '400',
    textAreaStretch: false, // we just want text as link, not entire label lane area
    descriptionTextYOffset: -2,
    height: 36,
  };

  static LABEL_LANE_STYLE_ACTIVE: Partial<LabelLaneStyle> = {
    // rightBackgroundFill: '#4C6BD8',
    rightBackgroundFill: Constants.COLORS.blue,
    rightBackgroundOpacity: 1,
  };

  static CUSTOM_AUDIO_TRACK_LANE_STYLE: Partial<AudioTrackLaneStyle> = {
    ...Constants.TIMELINE_LANE_STYLE,
    height: 40,
    maxSampleFillLinearGradientColorStops: Constants.VARIABLES.audioTrackLaneFillGradientColorStops,
    minSampleFillLinearGradientColorStops: Constants.VARIABLES.audioTrackLaneFillGradientColorStops.map((p) => (typeof p === 'number' ? 1 - p : p)),
  };

  static LINE_CHART_LANE_STYLE: Partial<LineChartLaneStyle> = {
    ...Constants.TIMELINE_LANE_STYLE,
    pointWidth: 5,
    lineStrokeWidth: 2,
    paddingTop: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    paddingBottom: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    height: 100,
  };

  static BAR_CHART_LANE_STYLE: Partial<BarChartLaneStyle> = {
    ...Constants.TIMELINE_LANE_STYLE,
    paddingTop: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    paddingBottom: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    height: 100,
    interpolationWidth: 10,
    itemCornerRadius: 10,
    itemPadding: 4,
    // itemFillLinearGradientColorStops: Constants.VARIABLES.audioTrackLaneFillGradientColorStops.map(p => (typeof p === 'number') ? (1 - p) : p)
  };

  static OG_CHART_LANE_STYLE: Partial<OgChartLaneStyle> = {
    ...Constants.TIMELINE_LANE_STYLE,
    paddingTop: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    paddingBottom: 3, // to ensure that related to lineStrokeWidth, min or max values are visible
    height: 100,
    interpolationWidth: 10,
    itemPadding: 4,
    // itemFillLinearGradientColorStops: Constants.VARIABLES.audioTrackLaneFillGradientColorStops.map(p => (typeof p === 'number') ? (1 - p) : p)
  };

  static SUBTITLES_LANE_STYLE: Partial<SubtitlesLaneStyle> = {
    ...Constants.TIMELINE_LANE_STYLE,
    height: 40,
    subtitlesLaneItemOpacity: 1,
    subtitlesLaneItemFill: '#F3C6B3',
    paddingTop: 7,
    paddingBottom: 7,
  };

  static TEXT_LABEL_STYLE: Partial<TextLabelStyle> = {
    fill: Constants.VARIABLES.text.fill,
    fontFamily: Constants.VARIABLES.text.fontFamily,
    fontSize: 13,
    align: 'left',
    verticalAlign: 'middle',
    offsetY: -2,
  };

  static TEXT_LABEL_STYLE_2: Partial<TextLabelStyle> = {
    ...Constants.TEXT_LABEL_STYLE,
    fill: '#ffffff',
  };

  static TEXT_LABEL_BUTTON_STYLE: Partial<TextLabelStyle> = {
    fontFamily: Constants.VARIABLES.text.fontFamily,
    fontSize: 13,
    align: 'center',
    verticalAlign: 'middle',
    fill: '#292D43',
    backgroundFill: '#CACFEA',
    backgroundBorderRadius: 2,
    offsetY: -2,
  };

  static SOUND_LABEL_BUTTON_STYLE: Partial<TextLabelStyle> = {
    ...Constants.TEXT_LABEL_BUTTON_STYLE,
    backgroundBorderRadius: [0, 2, 2, 0],
  };

  static TEXT_LABEL_BUTTON_ACTIVE_STYLE: Partial<TextLabelStyle> = {
    ...Constants.TEXT_LABEL_BUTTON_STYLE,
    fill: Constants.COLORS.white,
    backgroundFill: Constants.COLORS.blue,
  };

  static SOUND_LABEL_BUTTON_ACTIVE_STYLE: Partial<TextLabelStyle> = {
    ...Constants.SOUND_LABEL_BUTTON_STYLE,
    fill: Constants.COLORS.white,
    backgroundFill: Constants.COLORS.blue,
  };

  static TEXT_LABEL_BUTTON_DISABLED_STYLE: Partial<TextLabelStyle> = {
    ...Constants.TEXT_LABEL_BUTTON_STYLE,
    fill: '#CACFEA',
    backgroundFill: '#6D738F',
  };
}
