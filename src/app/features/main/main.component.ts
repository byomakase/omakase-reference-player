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

import {AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, Renderer2, ViewChild} from '@angular/core';
import {OmakasePlayerVideoComponent} from '../../shared/components/omakase-player/omakase-player-video/omakase-player-video.component';
import {ImageButton, ImageButtonConfig, OmakaseAudioTrack, SubtitlesVttTrack, TimelineApi, TimelineLaneApi} from '@byomakase/omakase-player';
import {BehaviorSubject, combineLatest, filter, forkJoin, fromEvent, Observable, Subject, take, takeUntil} from 'rxjs';
import {Constants} from '../../shared/constants/constants';
import {CoreModule} from '../../core/core.module';
import {SharedModule} from '../../shared/shared.module';
import {TimelineConfiguratorComponent} from './timeline-configurator/timeline-configurator.component';
import {ActivatedRoute, Event, Router} from '@angular/router';
import {StringUtil} from '../../util/string-util';
import {UrlUtil} from '../../util/url-util';
import {MainService} from './main.service';
import {z} from 'zod';
import {
  AudioMediaTrack,
  BasicAuthenticationData,
  BearerAuthenticationData,
  Channel,
  MasterManifest,
  SessionData,
  TextMediaTrack,
  TimelineLaneWithOptionalGroup,
  VideoMediaTrack,
} from '../../model/domain.model';
import {DomainUtil} from '../../util/domain-util';
import {TimelineService} from '../timeline/timeline.service';
import {ErrorData} from 'hls.js';
import {AudioGroupingLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/audio-grouping-lane';
import {VideoGroupingLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/video-grouping-lane';
import {AudioChannelLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/audio-channel-lane';
import {OmakasePlayerUtil} from '../../shared/components/omakase-player/omakase-player-util';
import {WindowService} from '../../core/browser/window.service';
import {MetadataOffcanvasComponent} from './metadata-offcanvas/metadata-offcanvas.component';
import {BaseGroupingLane, GroupingLaneVisibility} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/base-grouping-lane';
import {completeSub} from '../../util/rx-util';
import {TextTrackGroupingLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/text-track-grouping-lane';
import {isNullOrUndefined} from '../../util/object-util';
import {MetadataExplorerContentComponent} from './metadata-explorer/metadata-explorer-content.component';
import {VuMeterComponent} from './vu-meter/vu-meter.component';
import {TelemetryComponent} from './telemetry/telemetry.component';
import {CustomAudioTrackLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/custom-audio-track-lane';
import {Store} from '@ngxs/store';
import {AppActions} from '../../shared/state/app.actions';
import {ChartLegendComponent} from './chart-legend/chart-legend.component';
import {TimelineConfiguratorState} from './timeline-configurator/timeline-configurator.state';
import {TimelineConfiguratorActions} from './timeline-configurator/timeline-configurator.actions';
import {OmpApiService} from '../../shared/components/omakase-player/omp-api.service';
import {MetadataExplorerNavComponent} from './metadata-explorer/metadata-explorer-nav.component';
import {NgbNav} from '@ng-bootstrap/ng-bootstrap';
import {LayoutService} from '../../core/layout/layout.service';
import {SegmentationListComponent} from './segmentation-list/segmentation-list.component';
import {SegmentationComponent} from './segmentation/segmentation.component';
import {SegmentationService} from './segmentation-list/segmentation.service';
import ShowExceptionModal = AppActions.ShowExceptionModal;
import SelectConfigLane = TimelineConfiguratorActions.SelectLane;
import SetLaneOptions = TimelineConfiguratorActions.SetLaneOptions;
import Minimize = TimelineConfiguratorActions.Minimize;
import {SessionNavigationComponent} from './session-navigation/session-navigation.component';
import {StatusComponent} from './status/status.component';

type GroupingLane = VideoGroupingLane | AudioGroupingLane | TextTrackGroupingLane;

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  standalone: true,
  imports: [
    CoreModule,
    SharedModule,
    TimelineConfiguratorComponent,
    MetadataOffcanvasComponent,
    MetadataExplorerContentComponent,
    MetadataExplorerNavComponent,
    SessionNavigationComponent,
    StatusComponent,
    VuMeterComponent,
    TelemetryComponent,
    ChartLegendComponent,
    SegmentationListComponent,
    SegmentationComponent,
  ],
})
export class MainComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(OmakasePlayerVideoComponent) appOmakasePlayerVideo?: OmakasePlayerVideoComponent;
  @ViewChild(VuMeterComponent) vuMeter!: VuMeterComponent;

  @ViewChild('northPole') northPoleElementRef!: ElementRef;
  @ViewChild('leftSection') leftSectionElementRef!: ElementRef;
  @ViewChild('telemetryWrapper') telemetryWrapperElementRef!: ElementRef;
  @ViewChild('vuMeterWrapper') vuMeterWrapperElementRef!: ElementRef;
  @ViewChild('playerWrapperInner') playerWrapperInnerElementRef!: ElementRef;

  private ngbNavElement!: NgbNav;

  OmakasePlayerConstants = Constants;

  showMetadata$ = new BehaviorSubject<boolean>(false);
  showPlayer$ = new BehaviorSubject<boolean>(false);
  timelineLanesAdded$ = new BehaviorSubject<boolean>(false);

  timelineConfigVisibility$ = this.store.select(TimelineConfiguratorState.visibility);

  private _timelineComponentReady$ = new BehaviorSubject<boolean>(false);

  private _destroyed$ = new Subject<void>();

  private _sessionData?: SessionData;
  private _masterManifests?: MasterManifest[]; // only supported manifests
  private _currentMasterManifest?: MasterManifest;
  private _currentAudioTrack?: OmakaseAudioTrack;
  private _currentAudioLane?: AudioGroupingLane | AudioChannelLane;
  private _collapsedGroups: string[] = [];

  private _disableSessionButtons$ = new BehaviorSubject<boolean>(true);

  /**
   * Last video time before video load, undefined on first load
   *
   * @private
   */
  private _videoPreviousTime: number | undefined;
  private _videoPreviousIsPlaying: boolean = false;

  private _videoMediaTracks?: VideoMediaTrack[];
  private _audioMediaTracks?: AudioMediaTrack[];
  private _textMediaTracks?: TextMediaTrack[];

  private _audioTracks?: OmakaseAudioTrack[];
  private _audioTracksByName?: Map<string, OmakaseAudioTrack>;

  private _subtitlesVttTracks?: SubtitlesVttTrack[];
  private _subtitlesVttTracksByName?: Map<string, SubtitlesVttTrack>;

  private _zoomInProgress = false;

  private _groupingLanes?: BaseGroupingLane<any>[];

  private _analysisGroups: Map<string, string[]> = new Map<string, string[]>();
  private _analysisWithoutGroup: string[] = [];

  private _manifestLoadBreaker$ = new Subject<void>();

  constructor(
    protected route: ActivatedRoute,
    protected ompApiService: OmpApiService,
    protected mainService: MainService,
    protected timelineService: TimelineService,
    protected windowService: WindowService,
    protected renderer: Renderer2,
    protected store: Store,
    protected router: Router,
    protected layoutService: LayoutService,
    protected segmentationService: SegmentationService
  ) {
    this.ompApiService.onCreate$
      .pipe(
        filter((p) => !!p),
        takeUntil(this._destroyed$)
      )
      .subscribe({
        next: () => {},
      });

    fromEvent<Event>(this.windowService.window, 'resize')
      .pipe(takeUntil(this._destroyed$))
      .subscribe((event) => {
        this.adjustMetadataExplorerStyles();
      });

    this._timelineComponentReady$
      .pipe(
        takeUntil(this._destroyed$),
        filter((p) => p),
        take(1)
      )
      .subscribe({
        next: () => {
          this.ompApiService.api!.timeline!.onTimecodeClick$.pipe(takeUntil(this._destroyed$)).subscribe({
            next: (event) => {
              this.ompApiService.api!.video.seekToTimecode(event.timecode).subscribe();
            },
          });

          this.processScrubberLane();
        },
      });
  }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this._destroyed$)).subscribe((queryParams) => {
      let sessionUrl = queryParams['session'];
      let manifestId = queryParams['manifest'];

      if (StringUtil.isNonEmpty(sessionUrl) && UrlUtil.isValid(sessionUrl)) {
        this.mainService.fetchBootstrapPayload(sessionUrl).subscribe({
          next: (sessionData) => {
            if (!sessionData) {
              throw new Error('Could not load bootstrap data');
            }

            let sessionDataValid = this.validateSessionData(sessionData);

            if (sessionDataValid) {
              this.showPlayer$.next(true);
            } else {
              throw new Error('Bootstrap loaded succesfully, but some of the validations failed');
            }

            this._sessionData = sessionData;
            this._masterManifests = this._sessionData.data.master_manifests.filter((p) => this.isManifestSupported(p));

            if (this._sessionData.data.presentation.layout.qc && this._sessionData.data.presentation.layout.segmentation) {
              this.layoutService.showTabs$.next(true);
            } else {
              this.layoutService.showTabs$.next(false);
            }

            this.showMetadata$.next(true);

            this.ompApiService.onCreate$
              .pipe(
                filter((p) => !!p),
                take(1)
              )
              .subscribe({
                next: () => {
                  this.ompApiService.api!.alerts.configure({duration: 3000});

                  if (this._sessionData!.authentication) {
                    this.ompApiService.api!.setAuthentication(this._sessionData!.authentication as BasicAuthenticationData | BearerAuthenticationData);
                  }

                  if (this._masterManifests!.length < this._sessionData!.data.master_manifests.length) {
                    this.ompApiService.api!.alerts.warn('HDR playback not supported on this platform. Use Safari to view HDR options.', {autodismiss: true});
                  }

                  // TODO correct
                  setTimeout(() => {
                    this.loadManifest(manifestId);
                  });
                },
              });
          },
          error: (err) => {
            throw new Error(`Error loading bootstrap data from session url: ${sessionUrl}`);
          },
        });
      } else {
        throw new Error('Session URL not provided or invalid');
      }
    });
  }

  ngAfterViewInit() {
    this.adjustMetadataExplorerStyles();
  }

  ngOnDestroy() {
    completeSub(this._manifestLoadBreaker$);
    completeSub(this._destroyed$);
    this._disableSessionButtons$.complete();
  }

  onOmakasePlayerTimelineReady(timelineApi: TimelineApi) {
    this._timelineComponentReady$.next(true);
  }

  private loadVideo(): Observable<void> {
    return new Observable<void>((o$) => {
      let frameRate = DomainUtil.resolveFrameRate(this._currentMasterManifest!, this._videoMediaTracks);
      this.ompApiService
        .api!.loadVideo(this._currentMasterManifest!.url, frameRate, {
          dropFrame: isNullOrUndefined(this._currentMasterManifest!.drop_frame) ? false : this._currentMasterManifest!.drop_frame,
          ffom: isNullOrUndefined(this._currentMasterManifest!.ffom) ? void 0 : this._currentMasterManifest!.ffom,
        })
        .pipe(take(1))
        .subscribe({
          next: (video) => {
            this.populateVideoHelpMenu();

            try {
              if (this.ompApiService.api!.video.getHls()) {
                // @ts-ignore
                this.ompApiService.api!.video.getHls()!.on('hlsError', this.hlsFragLoadErrorHandler);
              }
            } catch (e) {
              if ((e as Error).name === 'OmpVideoWindowPlaybackError') {
                console.warn((e as Error).message);
              } else {
                console.error(e);
              }
            }

            completeSub(o$);
          },
        });
    });
  }

  private cleanTimeline(): void {
    this.ompApiService.api?.timeline?.removeAllTimelineLanes();
  }

  private createVideoMediaTrackLanes(): TimelineLaneApi[] {
    let lanes: TimelineLaneApi[] = [];

    if (this._videoMediaTracks && this._videoMediaTracks.length > 0) {
      this._videoMediaTracks.forEach((videoMediaTrack, index) => {
        let groupingLane = this.createVideoGroupingLane(videoMediaTrack, index);
        lanes.push(groupingLane);
        this._groupingLanes!.push(groupingLane);

        if (videoMediaTrack.visual_reference && videoMediaTrack.visual_reference.length > 0) {
          videoMediaTrack.visual_reference.forEach((visualReference) => {
            let lane = this.timelineService.createLaneByVisualReference(visualReference);
            lanes.push(lane);
            groupingLane.addChildLane(lane);
          });
        }

        if (videoMediaTrack.analysis && videoMediaTrack.analysis.length > 0) {
          let analysisLanes = this.timelineService.createAnalysisLanes(videoMediaTrack.analysis);
          analysisLanes.forEach((lane) => {
            lanes.push(lane);
            groupingLane.addChildLane(lane);
          });

          this.extendAnalysisGroups(analysisLanes);
        }

        if (this._collapsedGroups.includes(groupingLane.description)) {
          groupingLane.groupMinimize();
        }
      });
    }

    return lanes;
  }

  private createAudioMediaTrackLanes(): TimelineLaneApi[] {
    this._currentAudioLane = undefined;

    let lanes: TimelineLaneApi[] = [];

    if (this._audioMediaTracks && this._audioMediaTracks.length > 0) {
      let defaultTrackSet = false;

      this._audioMediaTracks.forEach((audioMediaTrack, index) => {
        let audioGroupingLane = this.createAudioGroupingLane(audioMediaTrack, index);
        lanes.push(audioGroupingLane);
        this._groupingLanes!.push(audioGroupingLane);

        if (audioMediaTrack.program_name === this._currentAudioTrack?.label) {
          this._currentAudioLane = audioGroupingLane;
        }

        if (!defaultTrackSet && !audioGroupingLane.isDisabled) {
          audioGroupingLane.setAsActiveAudioTrack(false);
          defaultTrackSet = true;
        }

        let channelsInOrder = DomainUtil.resolveAudioMediaTrackChannelsInOrder(audioMediaTrack);
        let isAudioChannelLane = () => {
          return channelsInOrder && channelsInOrder.length > 0;
        };

        let isCustomAudioTrackLane = () => {
          return (!channelsInOrder || channelsInOrder.length === 0) && audioMediaTrack.visual_reference && audioMediaTrack.visual_reference.find((p) => p.type === 'waveform');
        };

        if (isAudioChannelLane()) {
          channelsInOrder!.forEach((channel, index) => {
            let audioChannelLane = this.createAudioChannelLane(audioMediaTrack, channel, index, channelsInOrder!.length);
            lanes.push(audioChannelLane);
            audioGroupingLane.addChildLane(audioChannelLane);

            if (audioChannelLane.name === this._currentAudioTrack?.label) {
              this._currentAudioLane = audioChannelLane;
            }

            if (!defaultTrackSet && !audioChannelLane.isDisabled) {
              audioChannelLane.setAsActiveAudioTrack(false);
              defaultTrackSet = true;
            }
          });
        } else if (isCustomAudioTrackLane()) {
          let customAudioTrackLane = this.createCustomAudioTrackLane(audioMediaTrack);
          lanes.push(customAudioTrackLane);
          audioGroupingLane.addChildLane(customAudioTrackLane);
        }

        if (audioMediaTrack.analysis && audioMediaTrack.analysis.length > 0) {
          let analysisLanes = this.timelineService.createAnalysisLanes(audioMediaTrack.analysis);
          analysisLanes.forEach((lane) => {
            lanes.push(lane);
            audioGroupingLane.addChildLane(lane);
          });

          this.extendAnalysisGroups(analysisLanes);
        }

        if (this._collapsedGroups.includes(audioGroupingLane.description)) {
          audioGroupingLane.groupMinimize();
        }
      });
    }

    return lanes;
  }

  private createTextTracksLanes(): TimelineLaneApi[] {
    let lanes: TimelineLaneApi[] = [];

    if (this._textMediaTracks && this._textMediaTracks.length > 0) {
      let defaultTrackSet = false;

      this._textMediaTracks.forEach((textMediaTrack, index) => {
        let subtitlesVttTrack = StringUtil.isNonEmpty(textMediaTrack.program_name) ? this._subtitlesVttTracksByName?.get(textMediaTrack.program_name) : void 0;

        let textTrackGroupingLane = this.createTextTrackGroupingLane(textMediaTrack, subtitlesVttTrack, index);
        lanes.push(textTrackGroupingLane);
        this._groupingLanes!.push(textTrackGroupingLane);

        if (!defaultTrackSet && !textTrackGroupingLane.isDisabled && !this.ompApiService.api!.subtitles.getActiveTrack()) {
          textTrackGroupingLane.setTextTrack();
          defaultTrackSet = true;
        }

        if (subtitlesVttTrack) {
          let lane = this.timelineService.createSubtitlesLane(subtitlesVttTrack);
          lanes.push(lane);
          textTrackGroupingLane.addChildLane(lane);
        }

        if (textMediaTrack.analysis && textMediaTrack.analysis.length > 0) {
          let analysisLanes = this.timelineService.createAnalysisLanes(textMediaTrack.analysis);
          analysisLanes.forEach((lane) => {
            lanes.push(lane);
            textTrackGroupingLane.addChildLane(lane);
          });

          this.extendAnalysisGroups(analysisLanes);
        }

        if (this._collapsedGroups.includes(textTrackGroupingLane.description)) {
          textTrackGroupingLane.groupMinimize();
        }
      });
    }

    return lanes;
  }

  private loadManifest(manifestId: string | undefined = void 0) {
    completeSub(this._manifestLoadBreaker$);
    this._manifestLoadBreaker$ = new Subject<void>();

    if (!this.ompApiService.onCreate$.value) {
      throw new Error('Omakase Player API not ready, cannot load manifest');
    }

    if (manifestId) {
      console.debug(`Selecting manifest with id: ${manifestId}`);
    }

    this._currentMasterManifest = manifestId ? this._masterManifests!.find((p) => p.id === manifestId) : this._masterManifests![0];

    console.debug('Manifest selected: ', this._currentMasterManifest);

    if (!this._currentMasterManifest) {
      throw new Error(`Could not select master manifest with id: ${manifestId}`);
    }

    let matchesManifest = (obj: {manifest_ids: string[]}): boolean => {
      return !!obj.manifest_ids.find((p) => p === this._currentMasterManifest!.id);
    };

    this._videoMediaTracks = this._sessionData!.data.media_tracks.video ? this._sessionData!.data.media_tracks.video.filter((p) => matchesManifest(p)) : void 0;
    this._audioMediaTracks = this._sessionData!.data.media_tracks.audio;
    this._textMediaTracks = this._sessionData!.data.media_tracks.text;

    // start video & timeline load
    let videoLoaded$ = new Subject<void>();
    let subtitlesLoaded$ = new Subject<void>();
    let appAudioLoaded$ = new Subject<void>();
    let timelineExceptTextTracksCreated$ = new Subject<TimelineLaneApi[]>();
    let timelineTextTracksCreated$ = new Subject<TimelineLaneApi[]>();
    let timelineLanesAdded$ = new Subject<void>();

    this._manifestLoadBreaker$.pipe(take(1)).subscribe(() => {
      // remove listeners set for error handling
      try {
        console.debug('Trying to remove HLS listeners');
        if (this.ompApiService.api!.video.getHls()) {
          // @ts-ignore
          this.ompApiService.api!.video.getHls()!.off('hlsError', this.hlsFragLoadErrorHandler);
        }
      } catch (e) {
        if ((e as Error).name === 'OmpVideoWindowPlaybackError') {
          console.warn((e as Error).message);
        } else {
          console.error(e);
        }
      }
    });

    this.timelineLanesAdded$.next(false);

    // videoLoaded$.subscribe({
    //   next: () => {
    //     console.log('videoLoaded$')
    //   }
    // })
    //
    // appAudioLoaded$.subscribe({
    //   next: () => {
    //     console.log('appAudioLoaded$')
    //   }
    // })
    //
    // subtitlesLoaded$.subscribe({
    //   next: () => {
    //     console.log('subtitlesLoaded$')
    //   }
    // })
    //
    // timelineExceptTextTracksPopulated$.subscribe({
    //   next: () => {
    //     console.log('timelineExceptTextTracksPopulated$')
    //   }
    // })
    //
    // timelineTextTracksPopulated$.subscribe({
    //   next: () => {
    //     console.log('timelineTextTracksPopulated$')
    //   }
    // })
    //
    // timelinePopulated$.subscribe({
    //   next: () => {
    //     console.log('timelinePopulated$')
    //   }
    // })

    videoLoaded$.pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe({
      next: () => {
        combineLatest([timelineLanesAdded$, appAudioLoaded$])
          .pipe(takeUntil(this._manifestLoadBreaker$), take(1))
          .subscribe({
            next: () => {
              // track audio changes (triggered for example by detached window)
              this.ompApiService
                .api!.audio.onAudioLoaded$.pipe(
                  takeUntil(this._manifestLoadBreaker$),
                  filter((p) => !!p)
                )
                .pipe(takeUntil(this._manifestLoadBreaker$))
                .subscribe({
                  next: () => {
                    this.timelineService.getAudioGroupingLanes()?.forEach((lane) => {
                      lane.audioTrack = StringUtil.isNonEmpty(lane.audioMediaTrack.program_name) ? this._audioTracksByName?.get(lane.audioMediaTrack.program_name) : void 0;
                    });

                    this.timelineService.getAudioChannelLanes()?.forEach((lane) => {
                      lane.audioTrack = StringUtil.isNonEmpty(lane.audioMediaTrack.program_name) ? this._audioTracksByName?.get(lane.audioMediaTrack.program_name) : void 0;
                      lane.channelAudioTrack = StringUtil.isNonEmpty(lane.channel.program_name) ? this._audioTracksByName?.get(lane.channel.program_name) : void 0;
                    });
                  },
                });
            },
          });

        combineLatest([timelineLanesAdded$, subtitlesLoaded$])
          .pipe(takeUntil(this._manifestLoadBreaker$), take(1))
          .subscribe({
            next: () => {
              // track subtitle changes (triggered for example by detached window)
              this.ompApiService
                .api!.subtitles.onSubtitlesLoaded$.pipe(
                  takeUntil(this._manifestLoadBreaker$),
                  filter((p) => !!p)
                )
                .pipe(takeUntil(this._manifestLoadBreaker$))
                .subscribe({
                  next: () => {
                    const textTrackGroupingLanes = this.timelineService.getTextGroupingLanes();
                    if (!textTrackGroupingLanes) {
                      return;
                    }
                    textTrackGroupingLanes.forEach((lane) => {
                      const subtitlesVttTrack = this.ompApiService.api?.subtitles.getTracks().find((track) => track.label === lane.subtitlesVttTrack?.label);
                      if (!subtitlesVttTrack) {
                        return;
                      }
                      const isActiveLane = this.ompApiService.api!!.subtitles.getActiveTrack()?.id === lane.subtitlesVttTrack?.id;
                      const isCurrentTrack = this.ompApiService.api!!.subtitles.getActiveTrack()?.id === subtitlesVttTrack.id;
                      lane.subtitlesVttTrack = subtitlesVttTrack;
                      if (isActiveLane && !isCurrentTrack) {
                        lane.setTextTrack();
                      }
                      const subtitleLane = this.timelineService.getSubtitleLaneForGroupingLane(lane);
                      if (subtitleLane) {
                        subtitleLane.subtitlesVttTrack = lane.subtitlesVttTrack;
                      }
                    });
                  },
                });
            },
          });

        combineLatest([timelineExceptTextTracksCreated$, subtitlesLoaded$])
          .pipe(takeUntil(this._manifestLoadBreaker$), take(1))
          .subscribe({
            next: () => {
              timelineTextTracksCreated$.next(this.createTextTracksLanes());
              timelineTextTracksCreated$.complete();
            },
          });

        combineLatest([timelineExceptTextTracksCreated$, timelineTextTracksCreated$])
          .pipe(takeUntil(this._manifestLoadBreaker$), take(1))
          .subscribe({
            next: ([lanes1, lanes2]) => {
              let timelineLanes = [...lanes1, ...lanes2];
              if (this._sessionData!.data.presentation.timeline_configuration?.track_ordering?.length) {
                timelineLanes = this.orderMediaTracks(timelineLanes, this._sessionData!.data.presentation.timeline_configuration.track_ordering);
              }
              this.ompApiService.api!.timeline!.addTimelineLanes(timelineLanes);
              if (this._sessionData!.data.presentation.timeline_configuration?.visible_tracks?.length) {
                this.hideMediaTracks(timelineLanes, this._sessionData!.data.presentation.timeline_configuration.visible_tracks);
              } else if (this._sessionData!.data.presentation.timeline_configuration?.track_ordering?.length) {
                this.hideMediaTracks(timelineLanes, this._sessionData!.data.presentation.timeline_configuration.track_ordering);
              }

              completeSub(timelineLanesAdded$);
            },
          });

        timelineLanesAdded$.pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe({
          next: () => {
            const laneOptions =
              this.timelineService.getGroupingLanes()?.map((lane: any) => ({
                label: `${lane.description.split(' ')[0]} - ${lane._videoMediaTrack?.name ?? lane._audioMediaTrack?.name ?? lane._textMediaTrack?.name}`,
                value: lane.id,
              })) ?? [];
            this.store.dispatch(new SetLaneOptions(laneOptions));
            this.timelineLanesAdded$.next(true);
          },
          complete: () => {
            this._disableSessionButtons$.next(false);
          },
        });

        this.ompApiService
          .api!.audio.onAudioLoaded$.pipe(
            takeUntil(this._manifestLoadBreaker$),
            filter((p) => !!p),
            take(1)
          )
          .subscribe({
            next: (event) => {
              // populate audio tracks from hls stream
              this._audioTracks = this.ompApiService.api!.video.getAudioTracks();
              this._audioTracksByName = new Map<string, OmakaseAudioTrack>();
              this._audioTracks.forEach((audioTrack) => {
                this._audioTracksByName!.set(audioTrack.label, audioTrack);
              });
              completeSub(appAudioLoaded$);
            },
          });

        this.ompApiService
          .api!.subtitles.onSubtitlesLoaded$.pipe(
            takeUntil(this._manifestLoadBreaker$),
            filter((p) => !!p),
            take(1)
          )
          .subscribe({
            next: (event) => {
              // populate text tracks from hls stream
              this._subtitlesVttTracks = this.ompApiService.api!.subtitles.getTracks();
              this._subtitlesVttTracksByName = new Map<string, SubtitlesVttTrack>();
              this._subtitlesVttTracks.forEach((subtitlesVttTrack) => {
                this._subtitlesVttTracksByName!.set(subtitlesVttTrack.label, subtitlesVttTrack);
              });

              completeSub(subtitlesLoaded$);
            },
          });

        this._timelineComponentReady$
          .pipe(
            filter((p) => p),
            take(1)
          )
          .pipe(takeUntil(this._manifestLoadBreaker$), take(1))
          .subscribe({
            next: () => {
              this.adjustMetadataExplorerStyles();
              this._groupingLanes = [];
              timelineExceptTextTracksCreated$.next([...this.createVideoMediaTrackLanes(), ...this.createAudioMediaTrackLanes()]);
              timelineExceptTextTracksCreated$.complete();
            },
          });
      },
    });

    this.loadVideo()
      .pipe(takeUntil(this._manifestLoadBreaker$), take(1))
      .subscribe({
        next: () => {
          if (this._currentAudioLane) {
            this._currentAudioLane.setAsActiveAudioTrack(false);
          }
          if (this._videoPreviousTime !== void 0) {
            this.ompApiService
              .api!.video.seekToTime(this._videoPreviousTime)
              .subscribe({
                error: (err) => {
                  console.error(err);
                },
              })
              .add(() => {
                if (this._videoPreviousIsPlaying) {
                  this.ompApiService
                    .api!.video.play()
                    .subscribe()
                    .add(() => {
                      completeSub(videoLoaded$);
                    });
                } else {
                  completeSub(videoLoaded$);
                }
              });
          } else {
            completeSub(videoLoaded$);
          }
        },
      });
  }

  private orderMediaTracks(lanes: TimelineLaneApi[], order: string[]): TimelineLaneApi[] {
    const mediaTracks = this.getGroupingLanes(lanes);
    const groupedLanes = lanes.reduce(
      (groups, lane: any) => {
        if (mediaTracks.includes(lane)) {
          groups.push([lane]);
        } else {
          groups[groups.length - 1].push(lane);
        }
        return groups;
      },
      [] as Array<[GroupingLane, ...TimelineLaneApi[]]>
    );
    const orderedGroupedLanes = groupedLanes
      .filter((l) => order.includes(l[0].mediaTrackId))
      .sort((a, b) => {
        return order.indexOf(a[0].mediaTrackId) - order.indexOf(b[0].mediaTrackId);
      })
      .concat(groupedLanes.filter((l) => !order.includes(l[0].mediaTrackId)));
    return orderedGroupedLanes.flat();
  }

  private hideMediaTracks(lanes: TimelineLaneApi[], visible: string[]) {
    const mediaTracks = this.getGroupingLanes(lanes);
    mediaTracks.forEach((track) => {
      if (!visible.includes(track.mediaTrackId)) {
        track.toggleHidden('minimized');
      }
    });
  }

  private getGroupingLanes(lanes: TimelineLaneApi[]): GroupingLane[] {
    return lanes.filter((l) => l instanceof VideoGroupingLane || l instanceof AudioGroupingLane || l instanceof TextTrackGroupingLane) as GroupingLane[];
  }

  private hlsFragLoadErrorHandler(hlsErrorData: ErrorData) {
    if (hlsErrorData.type === 'networkError' && hlsErrorData.details === 'fragLoadError' && hlsErrorData.fatal) {
      this.store.dispatch(
        new ShowExceptionModal({
          message: 'Playback stalled, could not fetch required segments from server',
        })
      );
    }
  }

  private validateSessionData(sessionData: SessionData): boolean {
    let zodObject = z.object({
      authentication: z
        .object({
          type: z.enum(['none', 'basic', 'bearer']),
          username: z.string().optional(),
          password: z.string().optional(),
          token: z.string().optional(),
        })
        .refine(
          ({type, username, password}) => {
            return type !== 'basic' || (username !== undefined && password !== undefined);
          },
          {
            message: 'Username and password are required for basic authentication',
          }
        )
        .refine(
          ({type, token}) => {
            return type !== 'bearer' || token !== undefined;
          },
          {
            message: 'Token is required for bearer authentication',
          }
        )
        .optional(),
      data: z.object({
        master_manifests: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              // frame_rate: z.string(),
              url: z.string(),
            })
          )
          .min(1), // minimum of 1 master_manifest
        media_tracks: z
          .object({
            video: z
              .array(z.object({}))
              .min(0)
              .max(1) // to be relaxed in future
              .optional(),
            audio: z.array(z.object({})).min(0).optional(),
          })
          .refine(
            ({video, audio}) => {
              return (video !== undefined && video.length > 0) || (audio !== undefined && audio.length > 0);
            },
            {
              message: 'Either video or audio must be provided',
            }
          ),
      }),
    });

    try {
      let parse = zodObject.parse(sessionData);

      let masterManifests = sessionData.data.master_manifests.filter((p) => this.isManifestSupported(p));
      if (masterManifests.length < 1) {
        throw new Error(`Could not find supported master manifests`);
      }

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  private isManifestSupported(masterManifest: MasterManifest): boolean {
    return !(this.windowService.userAgent !== 'safari' && masterManifest.color_range && masterManifest.color_range !== 'sdr');
  }

  private processScrubberLane() {
    let scrubberLane = this.ompApiService.api!.timeline!.getScrubberLane();
    scrubberLane.style = {
      ...Constants.SCRUBBER_LANE_STYLE,
    };

    let buttonConfig: Partial<ImageButtonConfig> = {
      width: 35,
      height: 35,
      listening: true,
    };

    let zoomInButton = new ImageButton({
      ...Constants.IMAGE_BUTTONS.circlePlus,
      ...buttonConfig,
    });

    let zoomOutButton = new ImageButton({
      ...Constants.IMAGE_BUTTONS.circleMinus,
      ...buttonConfig,
    });

    scrubberLane.addTimelineNode({
      width: zoomOutButton.config.width!,
      height: zoomOutButton.config.height!,
      justify: 'end',
      margin: [0, 0, 0, 0],
      timelineNode: zoomOutButton,
    });

    scrubberLane.addTimelineNode({
      width: zoomInButton.config.width!,
      height: zoomInButton.config.height!,
      justify: 'end',
      margin: [0, -5, 0, 0],
      timelineNode: zoomInButton,
    });

    zoomInButton.onClick$.subscribe({
      next: (event) => {
        if (!this._zoomInProgress) {
          this._zoomInProgress = true;
          this.ompApiService
            .api!.timeline!.zoomInEased()
            .subscribe()
            .add(() => {
              this._zoomInProgress = false;
            });
        }
      },
    });

    zoomOutButton.onClick$.subscribe({
      next: (event) => {
        if (!this._zoomInProgress) {
          this._zoomInProgress = true;
          this.ompApiService
            .api!.timeline!.zoomOutEased()
            .subscribe()
            .add(() => {
              this._zoomInProgress = false;
            });
        }
      },
    });
  }

  private createVideoGroupingLane(videoMediaTrack: VideoMediaTrack, index: number): VideoGroupingLane {
    let description = `V${index + 1}`;

    let lane = new VideoGroupingLane({
      description: description,
      text: videoMediaTrack.name,
      videoMediaTrack: videoMediaTrack,
      style: {
        ...Constants.LABEL_LANE_STYLE,
        // DP-CORE-TIME-4
        // TODO Since player is currently limited to a single video track, if a video track is presented it will be active. Logic will need to change in the future when support for multiple video tracks is added
        ...Constants.LABEL_LANE_STYLE_ACTIVE,
      },
    });

    this.addGroupingLaneConfigButtonListener(lane);

    return lane;
  }

  private createAudioGroupingLane(audioMediaTrack: AudioMediaTrack, index: number): AudioGroupingLane {
    let description = `A${index + 1}${audioMediaTrack.channels && audioMediaTrack.channels.length > 0 ? ` (${audioMediaTrack.channels.length} ch)` : ``}`;

    let lane = new AudioGroupingLane({
      description: description,
      text: audioMediaTrack.name,
      audioMediaTrack: audioMediaTrack,
    });

    this.addGroupingLaneConfigButtonListener(lane);

    return lane;
  }

  private createTextTrackGroupingLane(textMediaTrack: TextMediaTrack, subtitlesVttTrack: SubtitlesVttTrack | undefined, index: number): TextTrackGroupingLane {
    let textTrackUsageLabel = DomainUtil.resolveTextTrackUsageLabel(textMediaTrack);

    let description = `T${index + 1}${textTrackUsageLabel ? ` (${textTrackUsageLabel})` : ``}`;

    let lane = new TextTrackGroupingLane(
      {
        description: description,
        text: textMediaTrack.name,
        textMediaTrack: textMediaTrack,
        subtitlesVttTrack: subtitlesVttTrack,
      },
      this.ompApiService.api!.subtitles
    );

    this.addGroupingLaneConfigButtonListener(lane);

    return lane;
  }

  private createAudioChannelLane(audioMediaTrack: AudioMediaTrack, channel: Channel, channelIndex: number, channelsCount: number): AudioChannelLane {
    let lane = new AudioChannelLane({
      audioMediaTrack: audioMediaTrack,
      channel: channel,
      channelIndex: channelIndex,
      channelsCount: channelsCount,
      style: {
        ...Constants.CUSTOM_AUDIO_TRACK_LANE_STYLE,
      },
    });

    return lane;
  }

  private createCustomAudioTrackLane(audioMediaTrack: AudioMediaTrack): CustomAudioTrackLane {
    let lane = new CustomAudioTrackLane({
      audioMediaTrack: audioMediaTrack,
      style: {
        ...Constants.CUSTOM_AUDIO_TRACK_LANE_STYLE,
      },
    });
    return lane;
  }

  private populateVideoHelpMenu() {
    if (this.ompApiService.api!!.video.getHelpMenuGroups().length < 1) {
      let helpMenuGroup = OmakasePlayerUtil.getKeyboardShortcutsHelpMenuGroup(this.windowService.platform);
      helpMenuGroup.items = [...helpMenuGroup.items];
      this.ompApiService.api!.video.appendHelpMenuGroup(helpMenuGroup);
    }
  }

  setNgbNav(ngbNav: NgbNav) {
    this.ngbNavElement = ngbNav;
  }

  adjustMetadataExplorerStyles() {
    if (this.northPoleElementRef && this.playerWrapperInnerElementRef && this.leftSectionElementRef) {
      let northPoleRect = this.northPoleElementRef.nativeElement.getBoundingClientRect();
      let playerRect = this.playerWrapperInnerElementRef.nativeElement.getBoundingClientRect();

      let newMaxWidth = northPoleRect.width - playerRect.width;
      let newMaxHeight = playerRect.height;

      this.renderer.setStyle(this.leftSectionElementRef.nativeElement, 'maxWidth', `${newMaxWidth}px`);
      this.renderer.setStyle(this.leftSectionElementRef.nativeElement, 'maxHeight', `${newMaxHeight}px`);
      if (this.telemetryWrapperElementRef) {
        this.renderer.setStyle(this.telemetryWrapperElementRef.nativeElement, 'maxHeight', `${newMaxHeight}px`);
      }
      if (this.vuMeterWrapperElementRef) {
        this.renderer.setStyle(this.vuMeterWrapperElementRef.nativeElement, 'maxHeight', `${newMaxHeight}px`);
      }
    }
  }

  handleManifestChange(masterManifest: MasterManifest) {
    let videoPreviousIsPlaying = this.ompApiService.api!.video.isPlaying();
    let captureState = () => {
      this._videoPreviousTime = this.ompApiService.api!.video.getCurrentTime();
      this._videoPreviousIsPlaying = videoPreviousIsPlaying;
      this._currentAudioTrack = this.ompApiService.api!.audio.getActiveAudioTrack();
      this._collapsedGroups = this.ompApiService
        .api!.timeline!.getTimelineLanes()
        .filter((lane) => (lane as BaseGroupingLane<any>).groupVisibility === 'minimized')
        .map((lane) => (lane as BaseGroupingLane<any>).description);
    };

    if (this.ompApiService.api!.video.isPlaying()) {
      this.ompApiService.api!.video.pause().subscribe({
        next: () => {
          captureState();
          this.store.dispatch(new Minimize());
          this.cleanTimeline();
          this.loadManifest(masterManifest.id);
        },
      });
    } else {
      captureState();
      this.store.dispatch(new Minimize());
      this.cleanTimeline();
      this.loadManifest(masterManifest.id);
    }
  }

  private extendAnalysisGroups(lanes: TimelineLaneWithOptionalGroup<TimelineLaneApi>[]) {
    lanes.forEach((lane: TimelineLaneWithOptionalGroup<TimelineLaneApi>) => {
      if (lane.group) {
        if (this._analysisGroups.has(lane.group)) {
          this._analysisGroups.get(lane.group)!.push(lane.id);
        } else {
          this._analysisGroups.set(lane.group, [lane.id]);
        }
      } else {
        this._analysisWithoutGroup.push(lane.id);
      }
    });
  }

  handleAnalysisGroupsVisibleChanged(visibleLanesMap: Map<string, boolean>) {
    let allFalse = ![...visibleLanesMap.values()].reduce((acc, curr) => acc || curr);

    [...visibleLanesMap.keys()].forEach((group) => {
      let ids = this._analysisGroups.get(group);
      if (visibleLanesMap.get(group) || allFalse) {
        if (ids && ids.length > 0) {
          this.timelineService.maximize(ids.map((id) => this.timelineService.getTimelineLaneById(id)!));
        }
      } else {
        if (ids && ids.length > 0) {
          this.timelineService.minimize(ids.map((id) => this.timelineService.getTimelineLaneById(id)!));
        }
      }
    });

    let lanes = this._analysisWithoutGroup.map((id) => this.timelineService.getTimelineLaneById(id)!);
    if (allFalse) {
      this.timelineService.maximize(lanes);
    } else {
      this.timelineService.minimize(lanes);
    }
  }

  handleGroupingLanesVisibility(visibility: GroupingLaneVisibility) {
    this.toggleGroupingLanesCollapse(visibility);
  }

  customEncode(url: string) {
    return encodeURI(url).replace(/\//g, '%2F');
  }

  handleSessionChange(newSessionUrl: string) {
    this._disableSessionButtons$.next(true);

    let sessionUrl = this.route.snapshot.queryParams['session'];
    sessionUrl = this.customEncode(sessionUrl);

    if (this.ompApiService.api!.video.isPlaying()) {
      this.ompApiService.api!.video.pause().subscribe({
        next: () => {
          this.performSessionCleanup();
          this.router.navigateByUrl(this.router.url.replace(sessionUrl, newSessionUrl));
        },
      });
    } else {
      this.performSessionCleanup();
      this.router.navigateByUrl(this.router.url.replace(sessionUrl, newSessionUrl));
    }
  }

  private performSessionCleanup() {
    this.store.dispatch(new Minimize());
    this.segmentationService.resetSegmentationMode();
    this.cleanTimeline();
  }

  private toggleGroupingLanesCollapse(visibility: GroupingLaneVisibility) {
    if (this.groupingLanes) {
      let maxLaneIndexForEasing = 0; // only first one
      // ease max numForEasing lanes
      let osEased$ = this.groupingLanes.filter((p, index) => index <= maxLaneIndexForEasing).map((p) => (visibility === 'minimized' ? p.groupMinimizeEased() : p.groupMaximizeEased()));

      this.groupingLanes
        .filter((p, index) => index > maxLaneIndexForEasing)
        .forEach((p) => {
          if (visibility === 'minimized') {
            p.groupMinimize();
          } else {
            p.groupMaximize();
          }
        });

      forkJoin(osEased$).pipe(take(1)).subscribe();
    }
  }

  private toggleAudioTrack(type: 'next' | 'previous') {
    let audioGroupingLanes = this.ompApiService
      .api!.timeline!.getTimelineLanes()
      .filter((p) => p instanceof AudioGroupingLane)
      .map((p) => p as AudioGroupingLane)
      .filter((p) => !p.isDisabled);

    if (audioGroupingLanes.length > 0) {
      let activeIndex = audioGroupingLanes.findIndex((p) => p.isActive);
      let newActiveIndex;
      if (activeIndex < 0) {
        newActiveIndex = type === 'next' ? 0 : audioGroupingLanes.length - 1;
      } else {
        newActiveIndex = type === 'next' ? (activeIndex === audioGroupingLanes.length - 1 ? 0 : activeIndex + 1) : activeIndex === 0 ? audioGroupingLanes.length - 1 : activeIndex - 1;
      }
      let nextActiveTrack = audioGroupingLanes[newActiveIndex].audioTrack;
      if (nextActiveTrack) {
        this.ompApiService.api!.video.setActiveAudioTrack(nextActiveTrack.id);
      }
    }
  }

  private toggleAudioChannelTrack(type: 'next' | 'previous') {
    let activeAudioGroupingLane = this.ompApiService
      .api!.timeline!.getTimelineLanes()
      .filter((p) => p instanceof AudioGroupingLane)
      .map((p) => p as AudioGroupingLane)
      .find((p) => p.isActive);

    if (activeAudioGroupingLane) {
      let audioChannelLanes = activeAudioGroupingLane.childLanes
        .filter((p) => p instanceof AudioChannelLane)
        .map((p) => p as AudioChannelLane)
        .filter((p) => !p.isDisabled);

      if (audioChannelLanes.length > 0) {
        let activeIndex = audioChannelLanes.findIndex((p) => p.isActive);
        let newActiveIndex;
        if (activeIndex < 0) {
          newActiveIndex = type === 'next' ? 0 : audioChannelLanes.length - 1;
        } else {
          newActiveIndex = type === 'next' ? (activeIndex === audioChannelLanes.length - 1 ? 0 : activeIndex + 1) : activeIndex === 0 ? audioChannelLanes.length - 1 : activeIndex - 1;
        }

        let nextActiveTrack = audioChannelLanes[newActiveIndex].channelAudioTrack;
        if (nextActiveTrack) {
          this.ompApiService.api!.video.setActiveAudioTrack(nextActiveTrack.id);
        }
      }
    }
  }

  private toggleTextTrack(type: 'next' | 'previous') {
    let groupingLanes = this.ompApiService
      .api!.timeline!.getTimelineLanes()
      .filter((p) => p instanceof TextTrackGroupingLane)
      .map((p) => p as TextTrackGroupingLane)
      .filter((p) => !p.isDisabled);

    if (groupingLanes.length > 0) {
      let activeIndex = groupingLanes.findIndex((p) => p.isActive);
      let newActiveIndex;
      if (activeIndex < 0) {
        newActiveIndex = type === 'next' ? 0 : groupingLanes.length - 1;
      } else {
        newActiveIndex = type === 'next' ? (activeIndex === groupingLanes.length - 1 ? 0 : activeIndex + 1) : activeIndex === 0 ? groupingLanes.length - 1 : activeIndex - 1;
      }
      let nextActiveTrack = groupingLanes[newActiveIndex].subtitlesVttTrack;
      if (nextActiveTrack) {
        this.ompApiService.api!.subtitles.showTrack(nextActiveTrack.id);
      }
    }
  }

  private addGroupingLaneConfigButtonListener(lane: BaseGroupingLane<any>) {
    lane.onConfigClick$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (event) => {
        const selectedLaneId = this.store.selectSnapshot(TimelineConfiguratorState.selectedLaneId);
        this.store.dispatch(new SelectConfigLane(selectedLaneId === lane.id ? undefined : lane.id));
      },
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (this.ompApiService.api) {
      let isHandled = OmakasePlayerUtil.handleKeyboardEvent(event, this.ompApiService.api, this.windowService.userAgent);
      if (isHandled) {
        event.preventDefault();
      } else {
        const targetElement = event.target as HTMLElement;
        const formInputs = ['INPUT', 'TEXTAREA'];
        if (formInputs.includes(targetElement.tagName.toUpperCase())) {
          return;
        }

        // Collapse / Expand All Timeline Rows - Ctrl + Shift + s
        if (event.code === 'KeyS' && event.shiftKey && event.ctrlKey) {
          this.toggleGroupingLanesCollapse(this.groupingLanesVisibility);
          event.preventDefault();
          return;
        }

        // Toggle Next Audio Track - Shift + a
        if (event.code === 'KeyA' && event.shiftKey) {
          this.toggleAudioTrack('next');
          event.preventDefault();
          return;
        }

        // Toggle Previous Audio Track -  a
        if (event.code === 'KeyA') {
          this.toggleAudioTrack('previous');
          event.preventDefault();
          return;
        }

        // Toggle Next Text Track - Shift + t
        if (event.code === 'KeyT' && event.shiftKey) {
          this.toggleTextTrack('next');
          event.preventDefault();
          return;
        }

        // Toggle Previous Text Track -  t
        if (event.code === 'KeyT') {
          this.toggleTextTrack('previous');
          event.preventDefault();
          return;
        }

        // Toggle Next Channel of Active Audio Track - Shift + a
        if (event.code === 'KeyC' && event.shiftKey && !event.ctrlKey && !event.metaKey) {
          this.toggleAudioChannelTrack('next');
          event.preventDefault();
          return;
        }

        // Toggle Previous Channel of Active Audio Track-  a
        if (event.code === 'KeyC' && !event.ctrlKey && !event.metaKey) {
          this.toggleAudioChannelTrack('previous');
          event.preventDefault();
          return;
        }
      }
    }
  }

  get sessionData(): SessionData | undefined {
    return this._sessionData;
  }

  get groupingLanes(): BaseGroupingLane<any>[] | undefined {
    return this._groupingLanes;
  }

  get currentMasterManifest(): MasterManifest | undefined {
    return this._currentMasterManifest;
  }

  get masterManifests(): MasterManifest[] | undefined {
    return this._masterManifests;
  }

  get analysisGroups(): Map<string, string[]> {
    return this._analysisGroups;
  }

  get groupingLanesVisibility(): GroupingLaneVisibility {
    if (this.groupingLanes) {
      let minimized = this.groupingLanes.filter((p) => p.groupVisibility === 'minimized');
      let maximized = this.groupingLanes.filter((p) => p.groupVisibility === 'maximized');

      if (minimized.length === this.groupingLanes.length) {
        return 'maximized';
      } else if (maximized.length === this.groupingLanes.length) {
        return 'minimized';
      } else {
        return 'minimized';
      }
    } else {
      return 'maximized';
    }
  }

  get isVuMeterSupported(): boolean {
    return this.windowService.userAgent !== 'safari';
  }

  get hasTelemetryLane(): boolean {
    return !!this.timelineService.getFirstTelemetryLane();
  }

  get ngbNav(): NgbNav {
    return this.ngbNavElement;
  }

  get disableSessionButtons(): BehaviorSubject<boolean> {
    return this._disableSessionButtons$;
  }

  get activeTab(): string {
    return this.layoutService.activeTab;
  }

  get navBarAboveVideo(): boolean {
    if (
      this._sessionData?.data.presentation.layout.qc &&
      (this._sessionData?.data.source_info || (this._sessionData?.data.presentation.info_tabs && this._sessionData?.data.presentation.info_tabs.length > 0))
    ) {
      return true;
    } else if (
      this._sessionData?.data.presentation.layout.segmentation ||
      this._sessionData?.data.presentation.layout.approval ||
      this._sessionData?.session?.status ||
      this._sessionData?.session?.next ||
      this._sessionData?.session?.previous
    ) {
      return true;
    }

    return false;
  }
}
