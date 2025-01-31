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

import {ClickEvent, ConfigWithOptionalStyle, SubtitlesApi, SubtitlesVttTrack, TextLabel, Timeline, VideoControllerApi} from '@byomakase/omakase-player';
import {BaseGroupingLane, BaseGroupingLaneConfig} from './base-grouping-lane';
import {TextMediaTrack} from '../../../../../model/domain.model';
import {SubtitlesControlImageButton} from './subtitles-control/subtitles-control-image-button';
import {takeUntil} from 'rxjs';
import {StringUtil} from '../../../../../util/string-util';
import {Constants} from '../../../../constants/constants';
import {LayoutService} from '../../../../../core/layout/layout.service';

export interface TextTrackGroupingLaneConfig extends BaseGroupingLaneConfig {
  textMediaTrack: TextMediaTrack;
  subtitlesVttTrack?: SubtitlesVttTrack;
}

export class TextTrackGroupingLane extends BaseGroupingLane<TextTrackGroupingLaneConfig> {
  private _subtitlesApi: SubtitlesApi;

  private _textMediaTrack: TextMediaTrack;
  private _subtitlesVttTrack?: SubtitlesVttTrack;

  private _subtitlesControlButton: SubtitlesControlImageButton;

  private _languageLabel?: TextLabel | undefined;

  constructor(config: ConfigWithOptionalStyle<TextTrackGroupingLaneConfig>, subtitlesApi: SubtitlesApi) {
    super({
      ...config,
      style: {
        ...Constants.LABEL_LANE_STYLE,
        ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS,
      },
    });

    this._subtitlesApi = subtitlesApi;

    this._textMediaTrack = config.textMediaTrack;
    this._subtitlesVttTrack = config.subtitlesVttTrack;

    this._subtitlesControlButton = new SubtitlesControlImageButton({
      disabled: this.isDisabled,
      srcDefault: LayoutService.themeStyleConstants.IMAGE_BUTTONS.chatbox.src,
      srcActive: LayoutService.themeStyleConstants.IMAGE_BUTTONS.chatboxActive.src,
      srcDisabled: LayoutService.themeStyleConstants.IMAGE_BUTTONS.chatboxDisabled.src,
      width: 22,
      height: 22,
    });

    let languageLabel = StringUtil.isNonEmpty(this._textMediaTrack.language)
      ? this._textMediaTrack.language
      : StringUtil.isNonEmpty(this._subtitlesVttTrack?.language)
        ? this._subtitlesVttTrack!.language
        : void 0;
    if (languageLabel) {
      this._languageLabel = new TextLabel({
        text: languageLabel.substring(0, 2).toUpperCase(),
        style: {
          ...Constants.TEXT_LABEL_STYLE_2,
          ...LayoutService.themeStyleConstants.TEXT_LABEL_STYLE_2_COLORS,
          align: 'left',
        },
      });
    }

    this.addTimelineNode({
      timelineNode: this._subtitlesControlButton.timelineNode,
      width: this._subtitlesControlButton.dimension.width,
      height: this._subtitlesControlButton.dimension.height,
      justify: 'start',
      margin: [0, 8, 0, 0],
    });

    if (this._languageLabel) {
      this.addTimelineNode({
        timelineNode: this._languageLabel,
        width: 30,
        height: 20,
        justify: 'start',
        margin: [0, 5, 0, 0],
      });
    }
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    if (!this.isDisabled) {
      this._subtitlesApi.onShow$.pipe(takeUntil(this._destroyed$)).subscribe({
        next: (event) => {
          this.updateStyles();
        },
      });

      this._subtitlesApi.onHide$.pipe(takeUntil(this._destroyed$)).subscribe({
        next: (event) => {
          this.updateStyles();
        },
      });

      this._subtitlesControlButton.timelineNode.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
        next: (event: ClickEvent) => {
          this.setTextTrack();
        },
      });

      this._textLabel!.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
        next: (event: ClickEvent) => {
          event.cancelableEvent.cancelBubble = true;
          this.setTextTrack();
        },
      });
    }

    this.updateStyles();
  }

  private updateStyles() {
    if (!this.isDisabled) {
      if (this.isActive) {
        this.style = {
          ...Constants.LABEL_LANE_STYLE_ACTIVE,
          ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_ACTIVE_COLORS,
        };
        this._subtitlesControlButton.state = 'active';
      } else {
        this.style = {
          ...Constants.LABEL_LANE_STYLE,
          ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS,
        };
        this._subtitlesControlButton.state = 'default';
      }
    }
  }

  setTextTrack() {
    if (!this.isDisabled) {
      if (this.isActive) {
        this._subtitlesApi.hideTrack(this._subtitlesVttTrack!.id);
      } else {
        this._subtitlesApi.showTrack(this._subtitlesVttTrack!.id);
      }
      this.updateStyles();
    }
  }

  get isActive(): boolean {
    let currentTrack = this._subtitlesApi.getActiveTrack();
    return !!currentTrack && !currentTrack.hidden && this._subtitlesVttTrack!.id === currentTrack.id;
  }

  get isDisabled(): boolean {
    return !this._subtitlesVttTrack;
  }

  get subtitlesVttTrack(): SubtitlesVttTrack | undefined {
    return this._subtitlesVttTrack;
  }

  set subtitlesVttTrack(subtitlesVttTrack: SubtitlesVttTrack | undefined) {
    this._subtitlesVttTrack = subtitlesVttTrack;
  }

  get mediaTrackId() {
    return this._textMediaTrack.id;
  }
}
