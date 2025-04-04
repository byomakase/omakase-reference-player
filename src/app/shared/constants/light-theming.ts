import {ThemeStyleConstants} from './theming';

export class LightThemeStyleConstants extends ThemeStyleConstants {
  static override IMAGES_ROOT = '/assets/images/timeline/light';

  static override IMAGE_BUTTONS = {
    ...ThemeStyleConstants.IMAGE_BUTTONS,
    circleMinus: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.circleMinus,
      src: `${this.IMAGES_ROOT}/icon-circle-minus.svg`,
    },
    circlePlus: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.circlePlus,
      src: `${this.IMAGES_ROOT}/icon-circle-plus.svg`,
    },
    chatbox: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.chatbox,
      src: `${this.IMAGES_ROOT}/icon-chatbox.svg`,
    },
    chatboxActive: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.chatboxActive,
      src: `${this.IMAGES_ROOT}/icon-chatbox-active.svg`,
    },
    chatboxCrossed: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.chatboxCrossed,
      src: `${this.IMAGES_ROOT}/icon-chatbox-crossed.svg`,
    },
    chevronDown: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.chevronDown,
      src: `${this.IMAGES_ROOT}/icon-chevron-down.svg`,
    },
    chevronRight: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.chevronRight,
      src: `${this.IMAGES_ROOT}/icon-chevron-right.svg`,
    },
    soundHorn: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.soundHorn,
      src: `${this.IMAGES_ROOT}/icon-sound-horn.svg`,
    },
    soundHornActive: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.soundHornActive,
      src: `${this.IMAGES_ROOT}/icon-sound-horn-active.svg`,
    },
    soundHornMuted: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.soundHornActive,
      src: `${this.IMAGES_ROOT}/icon-sound-horn-muted.svg`,
    },
    telemetryActive: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.telemetryActive,
      src: `${this.IMAGES_ROOT}/icon-telemetry-active.svg`,
    },
    telemetryInactive: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.telemetryInactive,
      src: `${this.IMAGES_ROOT}/icon-telemetry-inactive.svg`,
    },
    telemetryDisabled: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.telemetryDisabled,
      src: `${this.IMAGES_ROOT}/icon-telemetry-disabled.svg`,
    },
    config: {
      ...ThemeStyleConstants.IMAGE_BUTTONS.config,
      src: `${this.IMAGES_ROOT}/icon-gear.svg`,
    },
  };

  static override COLORS = {
    ...ThemeStyleConstants.COLORS,

    BLUE: '#4e8cb7',

    TEXT_FILL_COLOR: '#3a3d4b',

    AUDIO_TRACK_LANE_FILL_GRADIENT_COLOR_STOPS: [0, '#a2ca69', 0.33, '#a2ca69', 0.5, '#a2ca69', 0.59, '#a2ca69', 0.78, '#a2ca69', 0.93, '#a2ca69', 1, '#a2ca69'],
  };

  static override TIMELINE_CONFIG_STYLE_COLORS = {
    style: {
      ...ThemeStyleConstants.TIMELINE_CONFIG_STYLE_COLORS.style,

      backgroundFill: this.COLORS.WHITE,

      headerBackgroundFill: '#e3e3e3',
      footerBackgroundFill: '#e3e3e3',

      scrollbarBackgroundFill: '#d0d5d8',
      scrollbarHandleBarFill: '#d0d5d8',

      playheadFill: this.COLORS.GREEN,
      playheadBufferedFill: '#cccccc',
      playheadBackgroundFill: '#dedede',

      playheadPlayProgressFill: this.COLORS.BLUE,

      scrubberFill: '#5a6c80',
      scrubberSnappedFill: '#9ED78D',
      scrubberTextFill: this.COLORS.TEXT_FILL_COLOR,
    },
  };

  static override TIMELINE_LANE_STYLE_COLORS = {
    ...ThemeStyleConstants.TIMELINE_LANE_STYLE_COLORS,
    backgroundFill: '#e3e3e3',
    rightBackgroundFill: '#e9f4fe',
    descriptionTextFill: this.COLORS.TEXT_FILL_COLOR,
  };

  static override THUMBNAIL_LANE_STYLE_COLORS = {
    ...ThemeStyleConstants.THUMBNAIL_LANE_STYLE_COLORS,
    ...this.TIMELINE_LANE_STYLE_COLORS,
  };

  static override MARKER_LANE_STYLE_COLORS = {
    ...ThemeStyleConstants.MARKER_LANE_STYLE_COLORS,
    ...this.TIMELINE_LANE_STYLE_COLORS,
  };

  static override PERIOD_MARKER_STYLE_COLORS = {
    ...ThemeStyleConstants.PERIOD_MARKER_STYLE_COLORS,
  };

  static override MOMENT_MARKER_STYLE_COLORS = {
    ...ThemeStyleConstants.MOMENT_MARKER_STYLE_COLORS,
  };

  static override SCRUBBER_LANE_STYLE_COLORS = {
    backgroundFill: '#edefee',
    leftBackgroundFill: this.TIMELINE_LANE_STYLE_COLORS.backgroundFill,
    rightBackgroundFill: '#edefee',

    tickFill: '#9297ab',

    timecodeFill: this.COLORS.TEXT_FILL_COLOR,

    descriptionTextFill: this.COLORS.TEXT_FILL_COLOR,
  };

  static override LABEL_LANE_STYLE_COLORS = {
    ...ThemeStyleConstants.LABEL_LANE_STYLE_COLORS,
    ...this.TIMELINE_LANE_STYLE_COLORS,
    textFill: '#292d43',
  };

  static override LABEL_LANE_STYLE_ACTIVE_COLORS = {
    ...ThemeStyleConstants.LABEL_LANE_STYLE_ACTIVE_COLORS,
    rightBackgroundFill: '#aedeff',
  };

  static override CUSTOM_AUDIO_TRACK_LANE_STYLE_COLORS = {
    ...ThemeStyleConstants.CUSTOM_AUDIO_TRACK_LANE_STYLE_COLORS,
    ...this.TIMELINE_LANE_STYLE_COLORS,
    maxSampleFillLinearGradientColorStops: this.COLORS.AUDIO_TRACK_LANE_FILL_GRADIENT_COLOR_STOPS,
    minSampleFillLinearGradientColorStops: this.COLORS.AUDIO_TRACK_LANE_FILL_GRADIENT_COLOR_STOPS.map((p) => (typeof p === 'number' ? 1 - p : p)),
  };

  static override LINE_CHART_LANE_STYLE_COLORS = {
    ...ThemeStyleConstants.LINE_CHART_LANE_STYLE_COLORS,
    ...this.TIMELINE_LANE_STYLE_COLORS,
  };

  static override BAR_CHART_LANE_STYLE_COLORS = {
    ...ThemeStyleConstants.BAR_CHART_LANE_STYLE_COLORS,
    ...this.TIMELINE_LANE_STYLE_COLORS,
  };

  static override OG_CHART_LANE_STYLE_COLORS = {
    ...ThemeStyleConstants.OG_CHART_LANE_STYLE_COLORS,
    ...this.TIMELINE_LANE_STYLE_COLORS,
  };

  static override SUBTITLES_LANE_STYLE_COLORS = {
    ...ThemeStyleConstants.SUBTITLES_LANE_STYLE_COLORS,
    ...this.TIMELINE_LANE_STYLE_COLORS,
    subtitlesLaneItemFill: '#a2ca69',
  };

  static override TEXT_LABEL_STYLE_COLORS = {
    ...ThemeStyleConstants.TEXT_LABEL_STYLE_COLORS,
    fill: this.COLORS.TEXT_FILL_COLOR,
  };

  static override TEXT_LABEL_STYLE_2_COLORS = {
    ...this.TEXT_LABEL_STYLE_COLORS,
    fill: this.COLORS.TEXT_FILL_COLOR,
  };

  static override TEXT_LABEL_BUTTON_STYLE_COLORS = {
    ...ThemeStyleConstants.TEXT_LABEL_BUTTON_STYLE_COLORS,
    fill: this.COLORS.WHITE,
    backgroundFill: this.COLORS.BLUE,
  };

  static override SOUND_LABEL_BUTTON_STYLE_COLORS = {
    ...this.TEXT_LABEL_BUTTON_STYLE_COLORS,
    ...ThemeStyleConstants.SOUND_LABEL_BUTTON_STYLE_COLORS,
  };

  static override SOUND_LABEL_BUTTON_DISABLED_STYLE_COLORS = {
    ...this.TEXT_LABEL_BUTTON_STYLE_COLORS,
    fill: '#CACFEA',
    backgroundFill: '#6D738F',
  };

  static override TEXT_LABEL_BUTTON_ACTIVE_STYLE_COLORS = {
    ...this.TEXT_LABEL_BUTTON_STYLE_COLORS,
    backgroundFill: this.COLORS.GREEN,
  };

  static override SOUND_LABEL_BUTTON_ACTIVE_STYLE_COLORS = {
    ...this.SOUND_LABEL_BUTTON_STYLE_COLORS,
    backgroundFill: this.COLORS.GREEN,
  };

  static override TEXT_LABEL_BUTTON_DISABLED_STYLE_COLORS = {
    ...this.TEXT_LABEL_BUTTON_STYLE_COLORS,
    fill: '#CACFEA',
    backgroundFill: '#6D738F',
  };
}
