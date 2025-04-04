import {
  AudioTrackLaneStyle,
  BarChartLaneStyle,
  ConfigWithOptionalStyle,
  LabelLaneStyle,
  LineChartLaneStyle,
  MomentMarkerStyle,
  OgChartLaneStyle,
  PeriodMarkerStyle,
  ScrubberLaneStyle,
  SubtitlesLaneStyle,
  TextLabelStyle,
  ThumbnailLaneStyle,
  TimelineConfig,
  TimelineLaneStyle,
} from '@byomakase/omakase-player';

export class ThemeStyleConstants {
  static IMAGES_ROOT = '/assets/images/timeline';

  static IMAGE_BUTTONS = {
    circleMinus: {
      src: `${this.IMAGES_ROOT}/icon-circle-minus.svg`,
      width: 42,
      height: 42,
    },
    circlePlus: {
      src: `${this.IMAGES_ROOT}/icon-circle-plus.svg`,
      width: 42,
      height: 42,
    },
    chatbox: {
      src: `${this.IMAGES_ROOT}/icon-chatbox.svg`,
      width: 20,
      height: 20,
    },
    chatboxActive: {
      src: `${this.IMAGES_ROOT}/icon-chatbox-active.svg`,
      width: 20,
      height: 20,
    },
    chatboxCrossed: {
      src: `${this.IMAGES_ROOT}/icon-chatbox-crossed.svg`,
      width: 20,
      height: 20,
    },
    chatboxDisabled: {
      src: `${this.IMAGES_ROOT}/icon-chatbox-disabled.svg`,
      width: 20,
      height: 20,
    },
    chevronDown: {
      src: `${this.IMAGES_ROOT}/icon-chevron-down.svg`,
      width: 20,
      height: 20,
    },
    chevronRight: {
      src: `${this.IMAGES_ROOT}/icon-chevron-right.svg`,
      width: 20,
      height: 20,
    },
    soundHorn: {
      src: `${this.IMAGES_ROOT}/icon-sound-horn.svg`,
      width: 26,
      height: 26,
    },
    soundHornActive: {
      src: `${this.IMAGES_ROOT}/icon-sound-horn-active.svg`,
      width: 26,
      height: 26,
    },
    soundHornMuted: {
      src: `${this.IMAGES_ROOT}/icon-sound-horn-muted.svg`,
      width: 26,
      height: 26,
    },
    soundHornDisabled: {
      src: `${this.IMAGES_ROOT}/icon-sound-horn-disabled.svg`,
      width: 26,
      height: 26,
    },
    telemetryActive: {
      src: `${this.IMAGES_ROOT}/icon-telemetry-active.svg`,
      width: 20,
      height: 20,
    },
    telemetryInactive: {
      src: `${this.IMAGES_ROOT}/icon-telemetry-inactive.svg`,
      width: 20,
      height: 20,
    },
    telemetryDisabled: {
      src: `${this.IMAGES_ROOT}/icon-telemetry-disabled.svg`,
      width: 20,
      height: 20,
    },
    config: {
      src: `${this.IMAGES_ROOT}/icon-gear.svg`,
      width: 20,
      height: 20,
    },
  };

  static COLORS = {
    BLUE: '#00A3E9',

    WHITE: '#FFFFFF',

    GREEN: '#87B840',

    TEXT_FILL_COLOR: '#FFFFFF',

    ENTITIES_COLORS: ['#989BFF', '#43F4FF', '#B2BAD6', '#D69D9D', '#FFE790', '#9ED78D', '#A3D7E2', '#C993F3', '#FF8E9C', '#FFD1C2', '#F58428', '#D3D3D3', '#F1FFBB'],

    LINE_COLORS: ['#C306E2', '#1079DA', '#37E03E', '#F54A4A', '#F9D726', '#CECECE'],

    SEGMENTATION_COLORS: ['#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2', '#FFBB79', '#F57F65', '#D69D9D', '#E335FF', '#316BFF', '#15EBAB', '#EEFF2F', '#FF8E21', '#FF3306', '#FF7272'],

    AUDIO_TRACK_LANE_FILL_GRADIENT_COLOR_STOPS: [0, '#747DAF', 0.33, '#8D8BB0', 0.5, '#A499B1', 0.59, '#C2AAB1', 0.78, '#D5B5B2', 0.93, '#E2BDB2', 1, '#F3C6B3'],
  };

  static TIMELINE_CONFIG_STYLE_COLORS: Partial<ConfigWithOptionalStyle<TimelineConfig>> = {
    style: {
      backgroundFill: '#353644',

      headerBackgroundFill: '#292D43',
      footerBackgroundFill: '#353644',

      scrollbarBackgroundFill: '#2839D4',
      scrollbarHandleBarFill: '#3A4CF4',

      playheadFill: '#43F4FF',
      playheadBufferedFill: '#989BFF',
      playheadBackgroundFill: '#83899E',
      playheadTextFill: 'transparent',
      playheadPlayProgressFill: '#3E44FE',

      scrubberFill: '#B2BAD6',
      scrubberSnappedFill: '#9ED78D',
      scrubberTextFill: this.COLORS.TEXT_FILL_COLOR,
    },
  };

  static TIMELINE_LANE_STYLE_COLORS: Partial<TimelineLaneStyle> = {
    backgroundFill: '#292D43',
    rightBackgroundFill: '#454857',
    descriptionTextFill: this.COLORS.TEXT_FILL_COLOR,
  };

  static THUMBNAIL_LANE_STYLE_COLORS: Partial<ThumbnailLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE_COLORS,
  };

  static MARKER_LANE_STYLE_COLORS: Partial<TimelineLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE_COLORS,
  };

  static PERIOD_MARKER_STYLE_COLORS: Partial<PeriodMarkerStyle> = {};

  static MOMENT_MARKER_STYLE_COLORS: Partial<MomentMarkerStyle> = {};

  static SCRUBBER_LANE_STYLE_COLORS: Partial<ScrubberLaneStyle> = {
    backgroundFill: '#3A3D4B',
    leftBackgroundFill: this.TIMELINE_LANE_STYLE_COLORS.backgroundFill,
    rightBackgroundFill: '#3A3D4B',

    tickFill: this.COLORS.TEXT_FILL_COLOR,

    timecodeFill: this.COLORS.TEXT_FILL_COLOR,

    descriptionTextFill: this.COLORS.TEXT_FILL_COLOR,
  };

  static LABEL_LANE_STYLE_COLORS: Partial<LabelLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE_COLORS,
    rightBackgroundFill: '#525979',
    textFill: this.COLORS.TEXT_FILL_COLOR,
  };

  static LABEL_LANE_STYLE_ACTIVE_COLORS: Partial<LabelLaneStyle> = {
    // rightBackgroundFill: '#4C6BD8',
    rightBackgroundFill: this.COLORS.BLUE,
  };

  static CUSTOM_AUDIO_TRACK_LANE_STYLE_COLORS: Partial<AudioTrackLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE_COLORS,
    maxSampleFillLinearGradientColorStops: this.COLORS.AUDIO_TRACK_LANE_FILL_GRADIENT_COLOR_STOPS,
    minSampleFillLinearGradientColorStops: this.COLORS.AUDIO_TRACK_LANE_FILL_GRADIENT_COLOR_STOPS.map((p) => (typeof p === 'number' ? 1 - p : p)),
  };

  static LINE_CHART_LANE_STYLE_COLORS: Partial<LineChartLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE_COLORS,
  };

  static BAR_CHART_LANE_STYLE_COLORS: Partial<BarChartLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE_COLORS,
    // itemFillLinearGradientColorStops: Constants.VARIABLES.audioTrackLaneFillGradientColorStops.map(p => (typeof p === 'number') ? (1 - p) : p)
  };

  static OG_CHART_LANE_STYLE_COLORS: Partial<OgChartLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE_COLORS,
    // itemFillLinearGradientColorStops: Constants.VARIABLES.audioTrackLaneFillGradientColorStops.map(p => (typeof p === 'number') ? (1 - p) : p)
  };

  static SUBTITLES_LANE_STYLE_COLORS: Partial<SubtitlesLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE_COLORS,
    subtitlesLaneItemFill: '#F3C6B3',
  };

  static TEXT_LABEL_STYLE_COLORS: Partial<TextLabelStyle> = {
    fill: this.COLORS.TEXT_FILL_COLOR,
  };

  static TEXT_LABEL_STYLE_2_COLORS: Partial<TextLabelStyle> = {
    ...this.TEXT_LABEL_STYLE_COLORS,
    fill: this.COLORS.WHITE,
  };

  static TEXT_LABEL_BUTTON_STYLE_COLORS: Partial<TextLabelStyle> = {
    fill: '#292D43',
    backgroundFill: '#CACFEA',
  };

  static SOUND_LABEL_BUTTON_STYLE_COLORS: Partial<TextLabelStyle> = {
    ...this.TEXT_LABEL_BUTTON_STYLE_COLORS,
  };

  static SOUND_LABEL_BUTTON_DISABLED_STYLE_COLORS: Partial<TextLabelStyle> = {
    ...this.TEXT_LABEL_BUTTON_STYLE_COLORS,
    fill: '#CACFEA',
    backgroundFill: '#6D738F',
  };

  static TEXT_LABEL_BUTTON_ACTIVE_STYLE_COLORS: Partial<TextLabelStyle> = {
    ...this.TEXT_LABEL_BUTTON_STYLE_COLORS,
    fill: this.COLORS.WHITE,
    backgroundFill: this.COLORS.BLUE,
  };

  static SOUND_LABEL_BUTTON_ACTIVE_STYLE_COLORS: Partial<TextLabelStyle> = {
    ...this.SOUND_LABEL_BUTTON_STYLE_COLORS,
    fill: this.COLORS.WHITE,
    backgroundFill: this.COLORS.BLUE,
  };

  static TEXT_LABEL_BUTTON_DISABLED_STYLE_COLORS: Partial<TextLabelStyle> = {
    ...this.TEXT_LABEL_BUTTON_STYLE_COLORS,
    fill: '#CACFEA',
    backgroundFill: '#6D738F',
  };
}

export type ThemeStyleConstantsType = typeof ThemeStyleConstants;
