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

import {ClickEvent, ConfigWithOptionalStyle, OmpAudioTrack, TextLabel, Timeline, VideoControllerApi} from '@byomakase/omakase-player';
import {AudioMediaTrack} from '../../../../../model/domain.model';
import {merge, switchMap, takeUntil} from 'rxjs';
import {BaseGroupingLane, BaseGroupingLaneConfig} from './base-grouping-lane';
import {SoundControlImageButton} from './sound-control/sound-control-image-button';
import {DomainUtil} from '../../../../../util/domain-util';
import {Constants} from '../../../../constants/constants';
import {LayoutService} from '../../../../../core/layout/layout.service';

export interface AudioGroupingLaneConfig extends BaseGroupingLaneConfig {
  audioMediaTrack: AudioMediaTrack;
}

export class AudioGroupingLane extends BaseGroupingLane<AudioGroupingLaneConfig> {
  private _audioTrack?: OmpAudioTrack;
  private _audioMediaTrack: AudioMediaTrack;
  private _soundControlButton?: SoundControlImageButton;
  private _soundLabelButton?: TextLabel | undefined;
  private _languageLabel?: TextLabel | undefined;

  constructor(config: ConfigWithOptionalStyle<AudioGroupingLaneConfig>) {
    super({
      ...config,
      style: {
        ...Constants.LABEL_LANE_STYLE,
        ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS,
      },
    });
    this._audioMediaTrack = config.audioMediaTrack;
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    this._soundControlButton = new SoundControlImageButton({
      state: 'disabled',
      srcDefault: LayoutService.themeStyleConstants.IMAGE_BUTTONS.soundHorn.src,
      srcActive: LayoutService.themeStyleConstants.IMAGE_BUTTONS.soundHornActive.src,
      srcDisabled: LayoutService.themeStyleConstants.IMAGE_BUTTONS.soundHornDisabled.src,
      srcMuted: LayoutService.themeStyleConstants.IMAGE_BUTTONS.soundHornMuted.src,
      width: 26,
      height: 26,
    });

    if (this._audioMediaTrack.sound_field) {
      this._soundLabelButton = new TextLabel({
        listening: true,
        text: DomainUtil.resolveSoundFieldLabel(this._audioMediaTrack),
        style: {
          ...Constants.SOUND_LABEL_BUTTON_STYLE,
          ...LayoutService.themeStyleConstants.SOUND_LABEL_BUTTON_STYLE_COLORS,
        },
      });
    }

    if (this._audioMediaTrack.language) {
      let text = this._audioMediaTrack.language!.toUpperCase();
      this._languageLabel = new TextLabel({
        text: text,
        style: {
          ...Constants.TEXT_LABEL_STYLE_2,
          ...LayoutService.themeStyleConstants.TEXT_LABEL_STYLE_2_COLORS,
        },
      });
    }

    this.addTimelineNode({
      timelineNode: this._soundControlButton.timelineNode,
      width: this._soundControlButton.dimension.width,
      height: this._soundControlButton.dimension.height,
      justify: 'start',
      margin: [0, this._soundLabelButton ? -4.5 : 5, 0, 0],
    });

    if (this._soundLabelButton) {
      this.addTimelineNode({
        timelineNode: this._soundLabelButton,
        width: 24,
        height: 20,
        justify: 'start',
        margin: [0, 5, 0, 0],
      });
    }

    if (this._languageLabel) {
      this.addTimelineNode({
        timelineNode: this._languageLabel,
        width: 22,
        height: 20,
        justify: 'start',
        margin: [0, 5, 0, 0],
      });
    }

    merge(this._videoController!.onAudioLoaded$, this._videoController!.onAudioSwitched$, this._videoController!.onVolumeChange$)
      .pipe(switchMap((value) => [value])) // // each new emission switches to latest, racing observables
      .pipe(takeUntil(this._destroyed$))
      .subscribe({
        next: (event) => {
          this.updateStyles();
        },
      });

    this._soundControlButton.timelineNode.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (event) => {
        this.setAsActiveAudioTrack();
      },
    });

    this._soundLabelButton?.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (event: ClickEvent) => {
        console.log(event);
        this.setAsActiveAudioTrack();
      },
    });

    this._textLabel!.onClick$.subscribe({
      next: (event) => {
        event.cancelableEvent.cancelBubble = true;
        this.setAsActiveAudioTrack();
      },
    });
  }

  private updateStyles() {
    let isMuted = this._videoController!.isMuted();

    if (this.isActive) {
      if (isMuted) {
        this.style = {
          ...Constants.LABEL_LANE_STYLE,
          ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS,
        };
      } else {
        this.style = {
          ...Constants.LABEL_LANE_STYLE_ACTIVE,
          ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_ACTIVE_COLORS,
        };
      }
    } else {
      this.style = {
        ...Constants.LABEL_LANE_STYLE,
        ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS,
      };
    }

    if (this.isActiveByAudioMediaTrack) {
      if (this._soundLabelButton) {
        this._soundLabelButton.style = {
          ...Constants.SOUND_LABEL_BUTTON_ACTIVE_STYLE,
          ...LayoutService.themeStyleConstants.SOUND_LABEL_BUTTON_ACTIVE_STYLE_COLORS,
        };
      }

      if (this._soundControlButton) {
        this._soundControlButton.state = isMuted ? 'default' : 'active';
      }
    } else {
      if (this._soundLabelButton) {
        this._soundLabelButton.style = {
          ...Constants.SOUND_LABEL_BUTTON_STYLE,
          ...LayoutService.themeStyleConstants.SOUND_LABEL_BUTTON_STYLE_COLORS,
        };
      }
      if (this._soundControlButton) {
        this._soundControlButton.state = this.isDisabled ? 'disabled' : 'default';
      }
    }
  }

  setAsActiveAudioTrack(toggleMuteIfActive = true) {
    let currentAudioTrack = this._videoController!.getActiveAudioTrack();
    if (this._audioTrack === currentAudioTrack) {
      if (toggleMuteIfActive) {
        if (this._videoController!.isMuted()) {
          this._videoController!.unmute();
        } else {
          this._videoController!.mute();
        }
      }
    } else {
      // select
      this._videoController!.setActiveAudioTrack(this._audioTrack!.id);
      this._videoController!.unmute();
    }
    this.updateStyles();
  }

  get isDisabled(): boolean {
    return !this._audioTrack;
  }

  get isActiveByAudioMediaTrack() {
    let currentAudioTrack = this._videoController!.getActiveAudioTrack();
    return !!currentAudioTrack && currentAudioTrack.label === this._audioMediaTrack.program_name;
  }

  get isActiveByChannel() {
    let currentAudioTrack = this._videoController!.getActiveAudioTrack();
    return !!this._audioMediaTrack.channels?.find((p) => p.program_name === currentAudioTrack?.label);
  }

  get isActive(): boolean {
    return this.isActiveByAudioMediaTrack || this.isActiveByChannel;
  }

  get audioTrack(): OmpAudioTrack | undefined {
    return this._audioTrack;
  }

  get audioMediaTrack(): AudioMediaTrack {
    return this._audioMediaTrack;
  }

  set audioTrack(value: OmpAudioTrack | undefined) {
    this._audioTrack = value;
    this.updateStyles();
  }

  get mediaTrackId() {
    return this._audioMediaTrack.id;
  }
}
