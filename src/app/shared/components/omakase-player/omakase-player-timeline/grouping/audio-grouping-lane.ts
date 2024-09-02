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

import {ClickEvent, ConfigWithOptionalStyle, TextLabel, Timeline} from '@byomakase/omakase-player';
import {Constants} from '../../../../constants/constants';
import {AudioMediaTrack} from '../../../../../model/domain.model';
import {MediaPlaylist} from 'hls.js';
import {Subject, take, takeUntil} from 'rxjs';
import {BaseGroupingLane, BaseGroupingLaneConfig} from './base-grouping-lane';
import {SoundControlImageButton} from './sound-control/sound-control-image-button';
import {DomainUtil} from '../../../../../util/domain-util';
import {VideoControllerApi} from '@byomakase/omakase-player/dist/video/video-controller-api';
import {completeSub} from '../../../../../util/rx-util';

export interface AudioGroupingLaneConfig extends BaseGroupingLaneConfig {
  audioMediaTrack: AudioMediaTrack;
}

export class AudioGroupingLane extends BaseGroupingLane<AudioGroupingLaneConfig> {
  private _mediaPlaylistAudioTrack?: MediaPlaylist;
  private _onMediaPlaylistAudioTrack$: Subject<void> = new Subject<void>();

  private _audioMediaTrack: AudioMediaTrack;
  private _soundControlButton?: SoundControlImageButton;
  private _soundLabelButton?: TextLabel | undefined;
  private _languageLabel?: TextLabel | undefined;


  constructor(config: ConfigWithOptionalStyle<AudioGroupingLaneConfig>) {
    super({
      ...config,
      style: {
        ...Constants.LABEL_LANE_STYLE
      }
    });

    this._audioMediaTrack = config.audioMediaTrack;
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    this._onMediaPlaylistAudioTrack$.pipe(take(1)).subscribe({
      next: (event) => {

        this._soundControlButton = new SoundControlImageButton({
          disabled: this.isDisabled,
          srcDefault: `${Constants.IMAGES_ROOT}/icon-sound-horn.svg`,
          srcActive: `${Constants.IMAGES_ROOT}/icon-sound-horn-active.svg`,
          srcDisabled: `${Constants.IMAGES_ROOT}/icon-sound-horn-disabled.svg`,
          srcMuted: `${Constants.IMAGES_ROOT}/icon-sound-horn-muted.svg`,
          width: 26,
          height: 26
        })

        if (this._audioMediaTrack.sound_field) {
          this._soundLabelButton = new TextLabel({
            listening: !this.isDisabled,
            text: DomainUtil.resolveSoundFieldLabel(this._audioMediaTrack),
            style: {
              ...Constants.SOUND_LABEL_BUTTON_STYLE
            }
          })
        }

        if (this._audioMediaTrack.language) {
          let text = this._audioMediaTrack.language!.toUpperCase();
          this._languageLabel = new TextLabel({
            text: text,
            style: {
              ...Constants.TEXT_LABEL_STYLE_2
            }
          })
        }

        this.addTimelineNode({
          timelineNode: this._soundControlButton.timelineNode,
          width: this._soundControlButton.dimension.width,
          height: this._soundControlButton.dimension.height,
          justify: 'start',
          margin: [0, this._soundLabelButton ? -4.5 : 5, 0, 0]
        });

        if (this._soundLabelButton) {
          this.addTimelineNode({
            timelineNode: this._soundLabelButton,
            width: 24,
            height: 20,
            justify: 'start',
            margin: [0, 5, 0, 0]
          })
        }

        if (this._languageLabel) {
          this.addTimelineNode({
            timelineNode: this._languageLabel,
            width: 22,
            height: 20,
            justify: 'start',
            margin: [0, 5, 0, 0]
          })
        }

        if (!this.isDisabled) {
          this._videoController!.onAudioSwitched$.pipe(takeUntil(this._destroyed$)).subscribe({
            next: (event) => {
              this.updateStyles();
            }
          })

          this._videoController!.onVolumeChange$.pipe(takeUntil(this._destroyed$)).subscribe({
            next: (event) => {
              this.updateStyles();
            }
          })

          this._soundControlButton.timelineNode.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
            next: (event) => {
              this.setAudioTrack();
            }
          })

          this._soundLabelButton?.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
            next: (event: ClickEvent) => {
              this.setAudioTrack();
            }
          })

          this._textLabel!.onClick$.subscribe({
            next: (event) => {
              event.cancelableEvent.cancelBubble = true;
              this.setAudioTrack();
            }
          })
        }

        this.updateStyles();
      }
    })

  }

  private updateStyles() {
    let currentAudioTrack: MediaPlaylist | undefined = this._videoController!.getCurrentAudioTrack();
    let isMuted = this._videoController!.isMuted();

    if (this.isActive) {
      if (isMuted) {
        this.style = {
          ...Constants.LABEL_LANE_STYLE
        }
      } else {
        this.style = {
          ...Constants.LABEL_LANE_STYLE_ACTIVE
        }
      }
    } else {
      this.style = {
        ...Constants.LABEL_LANE_STYLE
      }
    }

    if (currentAudioTrack && currentAudioTrack.name === this._audioMediaTrack.program_name) {
      if (this._soundLabelButton) {
        this._soundLabelButton.style = {
          ...Constants.SOUND_LABEL_BUTTON_ACTIVE_STYLE
        }
      }
      if (this._soundControlButton) {
        this._soundControlButton.state = isMuted ? 'default' : 'active';
      }
    } else {
      if (this._soundLabelButton) {
        this._soundLabelButton.style = {
          ...Constants.SOUND_LABEL_BUTTON_STYLE
        }
      }
      if (this._soundControlButton) {
        this._soundControlButton.state = this.isDisabled ? 'disabled' : 'default';
      }
    }
  }

  setAudioTrack(toggleMuteIfActive = true) {
    if (!this.isDisabled) {
      let currentAudioTrack: MediaPlaylist | undefined = this._videoController!.getCurrentAudioTrack();
      if (this._mediaPlaylistAudioTrack === currentAudioTrack) {
        if (toggleMuteIfActive) {
          if (this._videoController!.isMuted()) {
            this._videoController!.unmute();
          } else {
            this._videoController!.mute();
          }
        }
      } else {
        // select
        this._videoController!.setAudioTrack(this._mediaPlaylistAudioTrack!.id);
        this._videoController!.unmute();
      }
      this.updateStyles();
    }
  }

  get isDisabled(): boolean {
    return !this._mediaPlaylistAudioTrack;
  }

  get isActive(): boolean {
    let currentAudioTrack: MediaPlaylist | undefined = this._videoController!.getCurrentAudioTrack();
    let isChannelActive = !!this._audioMediaTrack.channels?.find(p => p.program_name === currentAudioTrack?.name);
    return !!currentAudioTrack && (currentAudioTrack.name === this._audioMediaTrack.program_name) || isChannelActive
  }

  get mediaPlaylistAudioTrack(): MediaPlaylist | undefined {
    return this._mediaPlaylistAudioTrack;
  }

  set mediaPlaylistAudioTrack(value: MediaPlaylist | undefined) {
    this._mediaPlaylistAudioTrack = value;
    completeSub(this._onMediaPlaylistAudioTrack$);
  }
}
