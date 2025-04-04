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
import {AudioMediaTrack, ChannelType} from '../../../../../model/domain.model';
import {combineLatest, map, merge, Observable, Subject, switchMap, take, takeUntil} from 'rxjs';
import {BaseGroupingLane, BaseGroupingLaneConfig} from './base-grouping-lane';
import {SoundControlImageButton} from './sound-control/sound-control-image-button';
import {DomainUtil} from '../../../../../util/domain-util';
import {Constants} from '../../../../constants/constants';
import {LayoutService} from '../../../../../core/layout/layout.service';
import {AudioChannelLane} from './audio-channel-lane';
import {AudioInputOutputNode} from '@byomakase/omakase-player/dist/video/model';
import {completeSub, errorCompleteObserver, nextCompleteObserver, passiveObservable} from '../../../../../util/rx-util';

export interface AudioGroupingLaneConfig extends BaseGroupingLaneConfig {
  audioMediaTrack: AudioMediaTrack;
}

export class AudioGroupingLane extends BaseGroupingLane<AudioGroupingLaneConfig> {
  private _audioTrack?: OmpAudioTrack;
  private _audioMediaTrack: AudioMediaTrack;
  private _soundControlButton?: SoundControlImageButton;
  private _soundLabelButton?: TextLabel | undefined;
  private _languageLabel?: TextLabel | undefined;
  private _audioChannelLanes: AudioChannelLane[] = [];

  private _soloedChannels: Array<boolean> = [];
  private _mutedChannels: Array<boolean> = [];
  private _soloedNodes: Array<Array<AudioInputOutputNode>> = [];
  private _mutedNodes: Array<Array<AudioInputOutputNode>> = [];

  onSoloMuteChecked$: Subject<void> = new Subject<void>();

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

    merge(this._videoController!.onAudioLoaded$, this._videoController!.onAudioSwitched$, this._videoController!.onVolumeChange$, this._videoController!.onMainAudioChange$)
      .pipe(switchMap((value) => [value])) // each new emission switches to latest, racing observables
      .pipe(takeUntil(this._destroyed$))
      .subscribe({
        next: (event) => {
          setTimeout(() => {
            if (this.isActive) {
              if (event && 'mainAudioState' in event) {
                if (this._videoController!.isMuted()) {
                  this._videoController!.unmute();
                }
              }
              combineLatest([this.updateSoloedChannels(), this.updateMutedChannels()])
                .pipe(take(1))
                .subscribe(() => {
                  this.onSoloMuteChecked$.next();
                  this.updateStyles();
                });
            } else {
              this.updateStyles();
            }
          });
        },
      });

    this._soundControlButton.timelineNode.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (event) => {
        this.setAsActiveAudioTrack();
      },
    });

    this._soundLabelButton?.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (event: ClickEvent) => {
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
    if (!this._videoController) {
      return;
    }

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

    if (this.isActive) {
      if (this._soundLabelButton) {
        if (isMuted) {
          this._soundLabelButton.style = {
            ...Constants.SOUND_LABEL_BUTTON_STYLE,
            ...LayoutService.themeStyleConstants.SOUND_LABEL_BUTTON_DISABLED_STYLE_COLORS,
          };
        } else {
          this._soundLabelButton.style = {
            ...Constants.SOUND_LABEL_BUTTON_ACTIVE_STYLE,
            ...LayoutService.themeStyleConstants.SOUND_LABEL_BUTTON_ACTIVE_STYLE_COLORS,
          };
        }
      }

      if (this._soundControlButton) {
        this._soundControlButton.state = isMuted ? 'muted' : 'active';
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

  setAsActiveAudioTrack(toggleMuteIfActive = true): Observable<void> {
    return passiveObservable((observer) => {
      let currentAudioTrack = this._videoController!.getActiveAudioTrack();
      if (this._audioTrack === currentAudioTrack) {
        if (toggleMuteIfActive) {
          (this._videoController!.isMuted() ? this._videoController!.unmute().pipe(map((p) => true)) : this._videoController!.mute().pipe(map((p) => true))).subscribe({
            next: () => {
              nextCompleteObserver(observer);
            },
            error: (error) => {
              errorCompleteObserver(observer, error);
            },
          });
        } else {
          nextCompleteObserver(observer);
        }
      } else {
        // select
        this._videoController!.setActiveAudioTrack(this._audioTrack!.id);
        this._videoController!.unmute();
        this.resetValues();

        let mainAudioState = this._videoController!.getMainAudioState();
        if (!mainAudioState || !mainAudioState.audioRouterState) {
          nextCompleteObserver(observer);
          return;
        }

        let visualReferencesInOrder = DomainUtil.resolveAudioMediaTrackVisualReferencesInOrder(this._audioMediaTrack);
        let matrix = DomainUtil.createDefaultMatrix(visualReferencesInOrder!.length, mainAudioState.audioRouterState.outputsNumber);

        this._videoController!.routeMainAudioRouterNodes(matrix)
          .pipe(take(1))
          .subscribe({
            next: () => {
              nextCompleteObserver(observer);
            },
            error: (error) => {
              errorCompleteObserver(observer, error);
            },
          });
      }
    });
  }

  toggleSolo(channel: ChannelType | undefined, channelInputIndex: number) {
    let mainAudioState = this._videoController?.getMainAudioState();

    if (!mainAudioState || !mainAudioState.audioRouterState) {
      return;
    }

    let visualReferencesInOrder = DomainUtil.resolveAudioMediaTrackVisualReferencesInOrder(this._audioMediaTrack);
    let channelOutputIndex = mainAudioState.audioRouterState.outputsNumber >= channelInputIndex + 1 ? channelInputIndex : undefined;
    let defaultNodes = DomainUtil.resolveAudioChannelLaneVisualization(channel, channelInputIndex, channelOutputIndex);

    let matrix: AudioInputOutputNode[] = [];
    let soloNodes = (nodes: AudioInputOutputNode[]) => {
      this._soloedNodes[channelInputIndex] = nodes;
      if (nodes.length > 1) {
        nodes.forEach(
          (node) =>
            (matrix.find((audioInputOutputNode) => audioInputOutputNode.inputNumber === node.inputNumber && audioInputOutputNode.outputNumber === node.outputNumber)!.connected = node.connected)
        );
      } else {
        matrix.forEach((audioInputOutputNode) => {
          if (audioInputOutputNode.inputNumber === nodes[0].inputNumber) {
            if (audioInputOutputNode.outputNumber === nodes[0].outputNumber) {
              audioInputOutputNode.connected = nodes[0].connected;
            } else {
              audioInputOutputNode.connected = false;
            }
          }
        });
      }
    };

    if (this._soloedChannels.at(channelInputIndex)) {
      matrix = DomainUtil.createDefaultMatrix(visualReferencesInOrder!.length, mainAudioState.audioRouterState.outputsNumber);
      soloNodes(this._soloedNodes.at(channelInputIndex)!);
      this._soloedNodes[channelInputIndex] = [];
    } else {
      matrix = DomainUtil.createEmptyMatrix(mainAudioState.audioRouterState.inputsNumber, mainAudioState.audioRouterState.outputsNumber);
      let currentChannelState = mainAudioState.audioRouterState?.audioInputOutputNodes.at(channelInputIndex)!.filter((node) => node.connected);
      this._mutedNodes.at(channelInputIndex)?.length ? soloNodes(this._mutedNodes.at(channelInputIndex)!) : currentChannelState.length ? soloNodes(currentChannelState) : soloNodes(defaultNodes);
    }

    this._videoController!.routeMainAudioRouterNodes(matrix)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this._soloedChannels = this._soloedChannels.map((p, index) => {
            if (index === channelInputIndex) {
              return !p;
            } else {
              return false;
            }
          });
        },
      });
  }

  private updateSoloedChannels(): Observable<void> {
    return passiveObservable((observer) => {
      let mainAudioState = this._videoController?.getMainAudioState();

      if (!mainAudioState || !mainAudioState.audioRouterState) {
        nextCompleteObserver(observer);
        return;
      }

      let clearSoloedChannel = (index: number) => {
        this._soloedChannels[index] = false;
        this._soloedNodes[index] = [];
      };

      let connectedNodes = mainAudioState.audioRouterState.audioInputOutputNodes
        .slice(0, this._audioMediaTrack.visual_reference!.length)
        .flatMap((audioInputOutputNode) => audioInputOutputNode.filter((node) => node.connected));

      this._soloedChannels.forEach((soloed, index) => {
        if (soloed) {
          if (connectedNodes.length !== this._soloedNodes[index].length) {
            clearSoloedChannel(index);
          } else {
            this._soloedNodes[index].forEach((selectedNode) => {
              if (!connectedNodes.find((node) => selectedNode.inputNumber === node.inputNumber && selectedNode.outputNumber === node.outputNumber && selectedNode.connected === node.connected)) {
                clearSoloedChannel(index);
                return;
              }
            });
          }
        }
      });

      nextCompleteObserver(observer);
    });
  }

  toggleMute(channel: ChannelType | undefined, channelInputIndex: number) {
    let mainAudioState = this._videoController?.getMainAudioState();

    if (!mainAudioState || !mainAudioState.audioRouterState) {
      return;
    }

    let channelOutputIndex = mainAudioState.audioRouterState.outputsNumber >= channelInputIndex + 1 ? channelInputIndex : undefined;
    let defaultNodes = DomainUtil.resolveAudioChannelLaneVisualization(channel, channelInputIndex, channelOutputIndex);
    let nodes: AudioInputOutputNode[] = [];

    if (this._mutedChannels.at(channelInputIndex)) {
      nodes = this._mutedNodes[channelInputIndex].length ? this._mutedNodes[channelInputIndex] : defaultNodes;
      this._mutedNodes[channelInputIndex] = [];
    } else {
      if (!this.isAnyChannelSoloed) {
        let currentChannelState = mainAudioState.audioRouterState.audioInputOutputNodes.at(channelInputIndex)!.filter((node) => node.connected);
        currentChannelState.length ? (this._mutedNodes[channelInputIndex] = currentChannelState) : (this._mutedNodes[channelInputIndex] = defaultNodes);

        nodes = [...Array(mainAudioState.audioRouterState.outputsNumber).keys()].map((p) => ({
          inputNumber: channelInputIndex,
          outputNumber: p,
          connected: false,
        }));
      } else {
        let visualReferencesInOrder = DomainUtil.resolveAudioMediaTrackVisualReferencesInOrder(this._audioMediaTrack);

        nodes = DomainUtil.createDefaultMatrix(visualReferencesInOrder!.length, mainAudioState.audioRouterState.outputsNumber);
        this._soloedNodes[channelInputIndex].length ? (this._mutedNodes[channelInputIndex] = this._soloedNodes[channelInputIndex]) : (this._mutedNodes[channelInputIndex] = defaultNodes);

        nodes.filter((node) => node.inputNumber === channelInputIndex).forEach((node) => (node.connected = false));
      }
    }

    this._videoController!.routeMainAudioRouterNodes(nodes)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this._mutedChannels[channelInputIndex] = !this._mutedChannels[channelInputIndex];
          this._soloedChannels = this._soloedChannels.map((p) => false);
        },
      });
  }

  private updateMutedChannels(): Observable<void> {
    return passiveObservable((observer) => {
      let mainAudioState = this._videoController?.getMainAudioState();

      if (!mainAudioState || !mainAudioState.audioRouterState) {
        nextCompleteObserver(observer);
        return;
      }

      if (!this.isAnyChannelSoloed) {
        this._mutedChannels.forEach((_, index) => {
          let currentChannelState = mainAudioState!.audioRouterState!.audioInputOutputNodes.at(index)!.filter((node) => node.connected);

          currentChannelState.length ? ((this._mutedChannels[index] = false), (this._mutedNodes[index] = [])) : (this._mutedChannels[index] = true);
        });
      } else {
        this._mutedChannels = this._mutedChannels.map((p) => false);
        this._mutedNodes = this._mutedNodes.map((p) => []);
      }

      nextCompleteObserver(observer);
    });
  }

  private resetValues() {
    this._soloedChannels = [];
    this._mutedChannels = [];
    this._soloedNodes = [];
    this._mutedNodes = [];
    this._audioChannelLanes.forEach(() => {
      this._soloedChannels.push(false);
      this._mutedChannels.push(false);
      this._soloedNodes.push([]);
      this._mutedNodes.push([]);
    });
  }

  override destroy(): void {
    super.destroy();
    completeSub(this.onSoloMuteChecked$);
  }

  get isDisabled(): boolean {
    return !this._audioTrack;
  }

  get isActive() {
    let currentAudioTrack = this._videoController!.getActiveAudioTrack();
    return !!currentAudioTrack && currentAudioTrack.label === this._audioMediaTrack.program_name;
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

  set audioChannelLanes(value: AudioChannelLane[]) {
    this._audioChannelLanes = value;
    this.resetValues();
  }

  get audioChannelLanes(): AudioChannelLane[] {
    return this._audioChannelLanes;
  }

  get isAnyChannelSoloed(): boolean {
    return !!this._soloedChannels.find((p) => !!p);
  }

  get soloedChannels(): Array<boolean> {
    return this._soloedChannels;
  }

  get mutedChannels(): Array<boolean> {
    return this._mutedChannels;
  }
}
