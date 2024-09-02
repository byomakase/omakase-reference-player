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

import {AudioTrackLane, AudioTrackLaneConfig, ClickEvent, ConfigWithOptionalStyle, TextLabel, Timeline} from '@byomakase/omakase-player';
import {Channel, VisualReference} from '../../../../../model/domain.model';
import {StringUtil} from '../../../../../util/string-util';
import {Constants} from '../../../../constants/constants';
import {MediaPlaylist} from 'hls.js';
import {forkJoin, Subject, take, takeUntil} from 'rxjs';
import {SoundControlTextButton} from './sound-control/sound-control-text-button';
import {VideoControllerApi} from '@byomakase/omakase-player/dist/video/video-controller-api';
import {completeSub} from '../../../../../util/rx-util';

export interface AudioChannelLaneConfig extends AudioTrackLaneConfig {
  channel: Channel;
  channelIndex: number,
  channelsCount: number
}

export class AudioChannelLane extends AudioTrackLane {
  private _mediaPlaylistAudioTrack?: MediaPlaylist;
  private _onMediaPlaylistAudioTrack$: Subject<void> = new Subject<void>();

  private _channelMediaPlaylistAudioTrack?: MediaPlaylist;
  private _onChannelMediaPlaylistAudioTrack$: Subject<void> = new Subject<void>();

  private _channel: Channel;
  private _waveformVisualReference?: VisualReference;
  private _channelOrderLabel?: TextLabel | undefined;
  private _soundControlSolo?: SoundControlTextButton;

  // private _soundControlM: SoundControlTextButton;

  constructor(config: ConfigWithOptionalStyle<AudioChannelLaneConfig>) {
    super(config);

    this._channel = config.channel;

    this._waveformVisualReference  = this._channel.visual_reference ? this._channel.visual_reference.find(p => p.type === 'waveform') : void 0;

    if (this._waveformVisualReference) {
      this.loadVtt(this._waveformVisualReference.url).subscribe()
    }
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    forkJoin([this._onMediaPlaylistAudioTrack$, this._onChannelMediaPlaylistAudioTrack$]).pipe(take(1)).subscribe({
      next: (event) => {

        if ((this._config as AudioChannelLaneConfig).channelsCount > 1) {
          this._soundControlSolo = new SoundControlTextButton({
            text: 'S',
            disabled: this.isDisabled,
            width: 22,
            height: 20,
          })

          this.addTimelineNode({
            timelineNode: this._soundControlSolo.timelineNode,
            width: this._soundControlSolo.dimension.width,
            height: this._soundControlSolo.dimension.height,
            justify: 'end',
            margin: [0, 5, 0, 0]
          });

          let channelOrderText = StringUtil.isNonEmpty(this._channel?.channel_order) ? this._channel!.channel_order!.toUpperCase() : `C${(this._config as AudioChannelLaneConfig).channelIndex + 1}`;
          this._channelOrderLabel = new TextLabel({
            text: channelOrderText,
            style: {
              ...Constants.TEXT_LABEL_STYLE,
              align: 'right'
            }
          })

          this.addTimelineNode({
            timelineNode: this._channelOrderLabel,
            width: 22,
            height: 20,
            justify: 'end',
            margin: [0, 10, 0, 0]
          });
        }

        if (!this.isDisabled) {
          this._videoController!.onVideoLoaded$.pipe(takeUntil(this._destroyed$)).subscribe({
            next: (event) => {
              this.updateStyles();
            }
          })

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

          this._soundControlSolo?.timelineNode.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
            next: (event: ClickEvent) => {
              this.setAudioTrack();
            }
          })
        }

        this.updateStyles()

      }
    })
  }

  setAudioTrack(toggleMuteIfActive = true) {
    if (!this.isDisabled) {
      if (this.isActive) {
        // switch to main audio track
        if (this._mediaPlaylistAudioTrack) {
          this._videoController!.setAudioTrack(this._mediaPlaylistAudioTrack!.id);
          this._videoController!.unmute();
        }
      } else {
        // select
        this._videoController!.setAudioTrack(this._channelMediaPlaylistAudioTrack!.id);
        this._videoController!.unmute();
      }
      this.updateStyles();
    }
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
    return !this._channelMediaPlaylistAudioTrack;
  }

  get isActive(): boolean {
    let currentAudioTrack: MediaPlaylist | undefined = this._videoController!.getCurrentAudioTrack();
    return !!currentAudioTrack && (this._channelMediaPlaylistAudioTrack === currentAudioTrack);
  }

  get channelMediaPlaylistAudioTrack(): MediaPlaylist | undefined {
    return this._channelMediaPlaylistAudioTrack;
  }

  get mediaPlaylistAudioTrack(): MediaPlaylist | undefined {
    return this._mediaPlaylistAudioTrack;
  }

  get name(): string {
    return this._channel.program_name;
  }

  set mediaPlaylistAudioTrack(value: MediaPlaylist | undefined) {
    this._mediaPlaylistAudioTrack = value;
    completeSub(this._onMediaPlaylistAudioTrack$);
  }

  set channelMediaPlaylistAudioTrack(value: MediaPlaylist | undefined) {
    this._channelMediaPlaylistAudioTrack = value;
    completeSub(this._onChannelMediaPlaylistAudioTrack$);
  }
}
