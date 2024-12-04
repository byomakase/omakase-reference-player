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

import {AudioTrackLane, AudioTrackLaneConfig, ClickEvent, ConfigWithOptionalStyle, OmakaseAudioTrack, TextLabel, Timeline, VideoControllerApi} from '@byomakase/omakase-player';
import {AudioMediaTrack, Channel, VisualReference} from '../../../../../model/domain.model';
import {StringUtil} from '../../../../../util/string-util';
import {Constants} from '../../../../constants/constants';
import {merge, switchMap, takeUntil} from 'rxjs';
import {SoundControlTextButton} from './sound-control/sound-control-text-button';

export interface AudioChannelLaneConfig extends AudioTrackLaneConfig {
  audioMediaTrack: AudioMediaTrack;
  channel: Channel;
  channelIndex: number;
  channelsCount: number;
}

export class AudioChannelLane extends AudioTrackLane {
  private _audioTrack?: OmakaseAudioTrack;
  private _channelAudioTrack?: OmakaseAudioTrack;

  private _audioMediaTrack: AudioMediaTrack;
  private _channel: Channel;
  private _waveformVisualReference?: VisualReference;
  private _channelOrderLabel?: TextLabel | undefined;
  private _soundControlSolo?: SoundControlTextButton;

  constructor(config: ConfigWithOptionalStyle<AudioChannelLaneConfig>) {
    super(config);

    this._audioMediaTrack = config.audioMediaTrack;
    this._channel = config.channel;

    this._waveformVisualReference = this._channel.visual_reference ? this._channel.visual_reference.find((p) => p.type === 'waveform') : void 0;

    if (this._waveformVisualReference) {
      this.loadVtt(this._waveformVisualReference.url).subscribe();
    }
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    if ((this._config as AudioChannelLaneConfig).channelsCount > 1) {
      this._soundControlSolo = new SoundControlTextButton({
        text: 'S',
        state: 'disabled',
        width: 22,
        height: 20,
      });

      this.addTimelineNode({
        timelineNode: this._soundControlSolo.timelineNode,
        width: this._soundControlSolo.dimension.width,
        height: this._soundControlSolo.dimension.height,
        justify: 'end',
        margin: [0, 5, 0, 0],
      });

      let channelOrderText = StringUtil.isNonEmpty(this._channel?.channel_order) ? this._channel!.channel_order!.toUpperCase() : `C${(this._config as AudioChannelLaneConfig).channelIndex + 1}`;
      this._channelOrderLabel = new TextLabel({
        text: channelOrderText,
        style: {
          ...Constants.TEXT_LABEL_STYLE,
          align: 'right',
        },
      });

      this.addTimelineNode({
        timelineNode: this._channelOrderLabel,
        width: 22,
        height: 20,
        justify: 'end',
        margin: [0, 10, 0, 0],
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

    this._soundControlSolo?.timelineNode.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (event: ClickEvent) => {
        this.setAsActiveAudioTrack();
      },
    });
  }

  setAsActiveAudioTrack(toggleMuteIfActive = true) {
    if (this.isActive) {
      // switch to main audio track
      if (this._audioTrack) {
        this._videoController!.setActiveAudioTrack(this._audioTrack.id);
        this._videoController!.unmute();
      }
    } else if (this._channelAudioTrack) {
      // select
      this._videoController!.setActiveAudioTrack(this._channelAudioTrack.id);
      this._videoController!.unmute();
    }
    this.updateStyles();
  }

  private updateStyles() {
    let isMuted = this._videoController!.isMuted();

    if (this.isActive) {
      if (this._soundControlSolo) {
        this._soundControlSolo.state = isMuted ? 'muted' : 'active';
      }
    } else {
      if (this._soundControlSolo) {
        this._soundControlSolo.state = this.isDisabled ? 'disabled' : 'default';
      }
    }
  }

  get isDisabled(): boolean {
    return !this._channelAudioTrack;
  }

  get isActive(): boolean {
    let currentAudioTrack = this._videoController!.getActiveAudioTrack();
    return !!currentAudioTrack && !!this._channelAudioTrack && this._channelAudioTrack.id === currentAudioTrack.id;
  }

  get channelAudioTrack(): OmakaseAudioTrack | undefined {
    return this._channelAudioTrack;
  }

  get audioMediaTrack(): AudioMediaTrack {
    return this._audioMediaTrack;
  }

  get channel(): Channel {
    return this._channel;
  }

  get audioTrack(): OmakaseAudioTrack | undefined {
    return this._audioTrack;
  }

  get name(): string {
    return this._channel.program_name;
  }

  set audioTrack(value: OmakaseAudioTrack | undefined) {
    this._audioTrack = value;
    this.updateStyles();
  }

  set channelAudioTrack(value: OmakaseAudioTrack | undefined) {
    this._channelAudioTrack = value;
    this.updateStyles();
  }
}
