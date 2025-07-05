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
import {ImageButton, ImageButtonConfig, OmpAudioTrack, OmpAudioTrackCreateType, SidecarAudioCreateEvent, SubtitlesVttTrack, ThumbnailLane, TimelineApi, TimelineLaneApi, Video} from '@byomakase/omakase-player';
import {BehaviorSubject, combineLatest, filter, forkJoin, fromEvent, map, Observable, of, Subject, take, takeUntil} from 'rxjs';
import {CoreModule} from '../../core/core.module';
import {SharedModule} from '../../shared/shared.module';
import {TimelineConfiguratorComponent} from './timeline-configurator/timeline-configurator.component';
import {ActivatedRoute, Event, Router} from '@angular/router';
import {StringUtil} from '../../util/string-util';
import {UrlUtil} from '../../util/url-util';
import {MainService} from './main.service';
import {z} from 'zod';
import {AudioMediaTrack, BasicAuthenticationData, BearerAuthenticationData, MainMedia, SessionData, SidecarEntry, TextMediaTrack, TimelineLaneWithOptionalGroup, VideoMediaTrack, VisualReference} from '../../model/domain.model';
import {DomainUtil} from '../../util/domain-util';
import {TelemetryLane, TimelineService} from '../timeline/timeline.service';
import {ErrorData} from 'hls.js';
import {AudioGroupingLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/audio-grouping-lane';
import {VideoGroupingLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/video-grouping-lane';
import {AudioChannelLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/audio-channel-lane';
import {OmakasePlayerUtil} from '../../shared/components/omakase-player/omakase-player-util';
import {WindowService} from '../../core/browser/window.service';
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
import {LayoutService, LayoutTab} from '../../core/layout/layout.service';
import {SegmentationListComponent} from './segmentation-list/segmentation-list.component';
import {SegmentationComponent} from './segmentation/segmentation.component';
import {SegmentationService} from './segmentation-list/segmentation.service';
import {SessionNavigationComponent} from './session-navigation/session-navigation.component';
import {StatusComponent} from './status/status.component';
import {TelemetryLineChartLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/telemetry-line-chart-lane';
import {TelemetryBarChartLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/telemetry-bar-chart-lane';
import {TelemetryOgChartLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/telemetry-og-chart-lane';
import {TelemetryMarkerLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/telemetry-marker-lane';
import {ToastService} from '../../shared/components/toast/toast.service';
import {ToastComponent} from '../../shared/components/toast/toast.component';
import {CryptoUtil} from '../../util/crypto-util';
import {MetadataExplorerService} from './metadata-explorer/metadata-explorer.service';
import {SegmentationState} from './segmentation/segmentation.state';
import {Constants} from '../../shared/constants/constants';
import {AnnotationService} from './annotation/annotation.service';
import {AnnotationComponent} from './annotation/annotation.component';
import {AnnotationState} from './annotation/annotation.state';
import ShowExceptionModal = AppActions.ShowExceptionModal;
import SelectConfigLane = TimelineConfiguratorActions.SelectLane;
import SetLaneOptions = TimelineConfiguratorActions.SetLaneOptions;
import Minimize = TimelineConfiguratorActions.Minimize;
import SelectLane = TimelineConfiguratorActions.SelectLane;

type GroupingLane = VideoGroupingLane | AudioGroupingLane | TextTrackGroupingLane;

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  standalone: true,
  imports: [
    CoreModule,
    SharedModule,
    TimelineConfiguratorComponent,
    MetadataExplorerContentComponent,
    MetadataExplorerNavComponent,
    SessionNavigationComponent,
    StatusComponent,
    VuMeterComponent,
    TelemetryComponent,
    ChartLegendComponent,
    SegmentationListComponent,
    SegmentationComponent,
    ToastComponent,
    AnnotationComponent,
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

  OmakasePlayerConstants = Constants;

  private ngbNavElement!: NgbNav;

  showMetadata$ = new BehaviorSubject<boolean>(false);
  showPlayer$ = new BehaviorSubject<boolean>(false);
  timelineLanesAdded$ = new BehaviorSubject<boolean>(false);
  sidecarsLoaded$ = new BehaviorSubject<boolean>(false);

  timelineConfigVisibility$ = this.store.select(TimelineConfiguratorState.visibility);

  private _timelineComponentReady$ = new BehaviorSubject<boolean>(false);

  private _destroyed$ = new Subject<void>();

  private _sessionData?: SessionData;
  private _mainMedias?: MainMedia[]; // only supported manifests
  private _currentMainMedia?: MainMedia;
  private _currentAudioTrack?: OmpAudioTrack;
  private _currentAudioLane?: AudioGroupingLane | AudioChannelLane;
  private _currentSubtitleTrackLabel?: string;

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

  private _sidecarAudioMediaTracks?: AudioMediaTrack[];
  private _sidecarTextMediaTracks?: TextMediaTrack[];

  private _sidecarAudioEntries?: SidecarEntry[];
  private _sidecarTextEntries?: SidecarEntry[];

  private _audioTracks?: OmpAudioTrack[];
  private _audioTracksByName?: Map<string, OmpAudioTrack>;
  private _muxedAudioTracks?: OmpAudioTrack[];

  private _subtitlesVttTracks?: SubtitlesVttTrack[];
  private _subtitlesVttTracksByName?: Map<string, SubtitlesVttTrack>;

  private _sidecarAudioTracks?: OmpAudioTrack[];
  private _sidecarAudioTracksByName?: Map<string, OmpAudioTrack>;

  private _sidecarSubtitlesVttTracks?: SubtitlesVttTrack[];
  private _sidecarSubtitlesVttTracksByName?: Map<string, SubtitlesVttTrack>;

  private _zoomInProgress = false;

  private _groupingLanes?: BaseGroupingLane<any>[];

  private _analysisGroups: Map<string, string[]> = new Map<string, string[]>();
  private _analysisWithoutGroup: string[] = [];
  public analysisGroupsVisibility: Map<string, boolean> = new Map<string, boolean>();
  private _analysisLaneParent: Map<string, GroupingLane> = new Map<string, GroupingLane>();

  private _manifestLoadBreaker$ = new Subject<void>();

  private videoLoaded$ = new Subject<void>();
  private sidecarAudiosLoaded$ = new BehaviorSubject<boolean>(false);
  private sidecarTextsLoaded$ = new BehaviorSubject<boolean>(false);
  private timelineReloaded$ = new Subject<void>();

  private _video?: Video;

  constructor(
    protected route: ActivatedRoute,
    protected ompApiService: OmpApiService,
    protected mainService: MainService,
    public timelineService: TimelineService,
    protected windowService: WindowService,
    protected renderer: Renderer2,
    protected store: Store,
    protected router: Router,
    protected layoutService: LayoutService,
    protected segmentationService: SegmentationService,
    protected toastService: ToastService,
    protected metadataExplorerService: MetadataExplorerService,
    protected annotationService: AnnotationService
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
        filter((p) => p)
      )
      .subscribe({
        next: () => {
          this.timelineService.onReady$.next();
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
      if (this.videoLoaded$) {
        completeSub(this.videoLoaded$);
        this.videoLoaded$ = new Subject<void>();
      }

      this.resetMetadataNav();
      this.resetPlayer();
      this.performSessionCleanup();

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
            this._mainMedias = this._sessionData.media.main.filter((p) => this.isMainMediaSupported(p));

            const sessionVideoTracks = this.sessionData!.presentation?.timeline.tracks.filter((track) => track.type === 'video') as VideoMediaTrack[];
            const sessionAudioTracks = this.sessionData!.presentation?.timeline.tracks.filter((track) => track.type === 'audio') as AudioMediaTrack[];
            const sessionTextTracks = this.sessionData!.presentation?.timeline.tracks.filter((track) => track.type === 'text') as TextMediaTrack[];
            this._videoMediaTracks = this.populateWithIds(sessionVideoTracks); // no filtering as there is no manifest id to match for
            this._audioMediaTracks = this.populateWithIds(sessionAudioTracks);
            this._textMediaTracks = this.populateWithIds(sessionTextTracks);

            if (this._sessionData.media.sidecars) {
              const audioSidecars = this._sessionData.media.sidecars.filter((sidecar) => sidecar.type === 'audio');
              const textSidecars = this._sessionData.media.sidecars.filter((sidecar) => sidecar.type === 'text');

              if (audioSidecars.length > 0) {
                this._sidecarAudioEntries = audioSidecars;
                this._sidecarAudioMediaTracks = audioSidecars
                  .map((sidecar) => this._audioMediaTracks!.find((mediaTrack) => mediaTrack.media_id === sidecar.id))
                  .filter((track): track is AudioMediaTrack => track !== undefined);
              }

              if (textSidecars.length > 0) {
                this._sidecarTextEntries = textSidecars;
                this._sidecarTextMediaTracks = textSidecars
                  .map((sidecar) => this._textMediaTracks!.find((mediaTrack) => mediaTrack.media_id === sidecar.id))
                  .filter((track): track is TextMediaTrack => track !== undefined);
              }
            }

            if (this.isInfoModeVisible) {
              this.layoutService.activeTab = 'info';
            } else if (this.isAnnotationModeVisible) {
              this.layoutService.activeTab = 'annotation';
            } else if (this.isSegmentationModeVisible) {
              this.layoutService.activeTab = 'segmentation';
            } else {
              this.layoutService.activeTab = 'info';
            }

            // this.layoutService.activeTab = 'annotation';

            if (this.isAnnotationModeVisible) {
              this.annotationService.initAnnotationMode();
            }

            if (sessionData.presentation?.info_tabs?.length && !sessionData.sources?.length) {
              this.metadataExplorerService.navActiveId = 'info-tab-0';
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

                  if (this._sessionData!.session?.services?.media_authentication && this._sessionData!.session.services.media_authentication.type !== 'none') {
                    this.ompApiService.api!.setAuthentication(this._sessionData!.session.services.media_authentication as BasicAuthenticationData | BearerAuthenticationData);
                  }

                  if (this._mainMedias!.length < this._sessionData!.media.main.length) {
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
            console.log(err);
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
    this.layoutService.disableSwitchModeButton$.complete();
    this._disableSessionButtons$.complete();
  }

  onOmakasePlayerTimelineReady(value: {timelineApi: TimelineApi; baseGroupingLanes: BaseGroupingLane<any>[]}) {
    this._timelineComponentReady$.next(true);
    if (this._video) {
      this.resetPlayer();

      this.videoLoaded$ = new Subject<void>();
      this.timelineReloaded$ = new Subject<void>();
      this.populateTimeline();

      this.timelineReloaded$.pipe(takeUntil(this._manifestLoadBreaker$)).subscribe({
        next: () => {
          if (this.isAnnotationModeVisible) {
            this.connectAnnotations();
          }
          if (this.isSegmentationModeVisible) {
            const activeTrack = this.store.selectSnapshot(SegmentationState.activeTrack);
            this.segmentationService.connectSegmentationMode(activeTrack, this._destroyed$);
          }

          const activeTimelineLaneId = this.store.selectSnapshot(TimelineConfiguratorState.selectedLaneId);
          let activeTimelineLane;

          value.baseGroupingLanes.forEach((baseGroupingLane) => {
            const lane = value.timelineApi.getTimelineLanes().find((lane) => lane instanceof BaseGroupingLane && lane.description === baseGroupingLane.description) as BaseGroupingLane<any>;

            if (lane) {
              lane.groupVisibility !== baseGroupingLane.groupVisibility ? lane.toggleGroupVisibility().subscribe() : void 0;

              baseGroupingLane.childLanes.forEach((childLane) => {
                if (this.timelineService.isAnalyticsLane(childLane)) {
                  const analyticsLane = lane.childLanes.find((lane) => (lane as TelemetryLane).description === (childLane as TelemetryLane).description) as TelemetryLane;

                  if (analyticsLane && analyticsLane.isHidden !== (childLane as TelemetryLane).isHidden) {
                    analyticsLane.toggleHidden();
                  }
                }
              });

              if (!baseGroupingLane.isEnabled) {
                lane.toggleHidden('minimized');
              }
            }

            if (baseGroupingLane.id === activeTimelineLaneId) {
              activeTimelineLane = lane;
            }
          });

          if (activeTimelineLane) {
            this.store.dispatch(new SelectLane((activeTimelineLane as BaseGroupingLane<any>).id));
          }
        },
      });

      completeSub(this.videoLoaded$);
    }
  }

  private loadVideo(): Observable<void> {
    return new Observable<void>((o$) => {
      let frameRate = this._currentMainMedia!.type === 'hls' ? undefined : DomainUtil.resolveFrameRate(this._currentMainMedia!, this._videoMediaTracks);
      this.ompApiService
        .api!.loadVideo(this._currentMainMedia!.url, {
          frameRate,
          dropFrame: isNullOrUndefined(this._currentMainMedia!.drop_frame) ? false : this._currentMainMedia!.drop_frame,
          ffom: isNullOrUndefined(this._currentMainMedia!.ffom) ? void 0 : this._currentMainMedia!.ffom,
          protocol: this.currentMainMedia!.type === 'hls' ? 'hls' : 'native',
        })
        .pipe(take(1))
        .subscribe({
          next: (video) => {
            this.populateVideoHelpMenu();
            this._video = video;

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

  private loadSidecarAudios(): Observable<void> {
    return new Observable<void>((o$) => {
      if (this._sidecarAudioEntries) {
        const partialSidecarAudioTracks: OmpAudioTrackCreateType[] = this._sidecarAudioEntries.map((sidecarEntry) => {
          const sidecarMediaTrack = this._sidecarAudioMediaTracks?.find((mediaTrack) => mediaTrack.media_id === sidecarEntry.id);
          return {
            id: sidecarEntry.id,
            src: sidecarEntry.url,
            language: sidecarMediaTrack?.language,
            label: sidecarMediaTrack?.media_id ?? sidecarEntry.id,
            channelCount: sidecarMediaTrack?.channel_layout ? sidecarMediaTrack.channel_layout.split(' ').length : 2,
          };
        });
        this.ompApiService.api!.audio.createSidecarAudioTracks(partialSidecarAudioTracks).subscribe((sidecarAudioTracks) => {
          this._sidecarAudioTracks = sidecarAudioTracks;
          this._sidecarAudioTracksByName = new Map();
          sidecarAudioTracks.forEach((track) => this._sidecarAudioTracksByName!.set(track.label!, track));
          const os$ = sidecarAudioTracks.map((track) => this.ompApiService.api!.audio.createSidecarAudioRouter(track.id, track.channelCount));

          forkJoin(os$).subscribe(() => {
            completeSub(o$);
            this.sidecarAudiosLoaded$.next(true);
          });
        });
      } else {
        completeSub(o$);
        this.sidecarAudiosLoaded$.next(true);
      }
    });
  }

  private loadSidecarTexts(): Observable<void> {
    return new Observable<void>((o$) => {
      if (this._sidecarTextEntries) {
        const partialSidecarTextTracks: Pick<SubtitlesVttTrack, 'id' | 'src' | 'label' | 'language' | 'default'>[] = this._sidecarTextEntries.map((sidecarEntry) => {
          const sidecarMediaTrack = this._sidecarTextMediaTracks?.find((mediaTrack) => mediaTrack.media_id === sidecarEntry.id);
          return {
            id: sidecarEntry.id,
            src: sidecarEntry.url,
            language: sidecarMediaTrack?.language ?? '',
            label: sidecarMediaTrack?.media_id ?? sidecarEntry.id,
            default: false,
          };
        });
        forkJoin(partialSidecarTextTracks.map((track) => this.ompApiService.api!.subtitles.createVttTrack(track))).subscribe({
          next: (tracks) => {
            this._sidecarSubtitlesVttTracksByName = new Map();
            if (this._subtitlesVttTracksByName === undefined) {
              this._subtitlesVttTracksByName = new Map();
            }

            tracks
              .filter((track) => track)
              .forEach((track) => {
                this._sidecarSubtitlesVttTracksByName!.set(track!.label, track!);
                this._subtitlesVttTracksByName!.set(track!.label, track!);
              });
            completeSub(o$);
            this.sidecarTextsLoaded$.next(true);
          },
        });
      } else {
        completeSub(o$);
        this.sidecarTextsLoaded$.next(true);
      }
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
            this._analysisLaneParent.set(lane.id, groupingLane);
          });

          groupingLane.onVisibilityChange$.subscribe({
            next: () => {
              if (this.analysisGroups.size > 0 && this.analysisGroupsVisibility) {
                this.handleAnalysisGroupsVisibleChanged();
              }
            },
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
        const isSidecar = this._sidecarAudioMediaTracks?.includes(audioMediaTrack) ?? false;
        let audioGroupingLane = this.createAudioGroupingLane(audioMediaTrack, index, isSidecar);
        lanes.push(audioGroupingLane);
        this._groupingLanes!.push(audioGroupingLane);

        if (audioMediaTrack.media_id === this._currentAudioTrack?.label) {
          this._currentAudioLane = audioGroupingLane;
        }

        if (!defaultTrackSet && !audioGroupingLane.isDisabled) {
          audioGroupingLane.setAsActiveAudioTrack(false);
          defaultTrackSet = true;
        }

        let visualReferencesInOrder = DomainUtil.resolveAudioMediaTrackVisualReferencesInOrder(audioMediaTrack);
        let isAudioChannelLane = () => {
          return visualReferencesInOrder && visualReferencesInOrder.length > 1;
        };

        let isCustomAudioTrackLane = () => {
          return !visualReferencesInOrder || visualReferencesInOrder.length <= 1;
        };

        if (isAudioChannelLane()) {
          visualReferencesInOrder!.forEach((visualReference, index) => {
            let audioChannelLane = this.createAudioChannelLane(audioMediaTrack, visualReference, audioGroupingLane, index, visualReferencesInOrder!.length, false, isSidecar);
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
          let customAudioTrackLane = this.createCustomAudioTrackLane(audioMediaTrack, true);
          lanes.push(customAudioTrackLane);
          audioGroupingLane.addChildLane(customAudioTrackLane);
        }

        if (audioMediaTrack.analysis && audioMediaTrack.analysis.length > 0) {
          let analysisLanes = this.timelineService.createAnalysisLanes(audioMediaTrack.analysis);
          analysisLanes.forEach((lane) => {
            lanes.push(lane);
            audioGroupingLane.addChildLane(lane);
            this._analysisLaneParent.set(lane.id, audioGroupingLane);
          });
          audioGroupingLane.onVisibilityChange$.subscribe({
            next: () => {
              if (this.analysisGroups.size > 0 && this.analysisGroupsVisibility) {
                this.handleAnalysisGroupsVisibleChanged();
              }
            },
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
        let subtitlesVttTrack = StringUtil.isNonEmpty(textMediaTrack.media_id) ? this._subtitlesVttTracksByName?.get(textMediaTrack.media_id) : void 0;

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
            this._analysisLaneParent.set(lane.id, textTrackGroupingLane);
          });

          textTrackGroupingLane.onVisibilityChange$.subscribe({
            next: () => {
              if (this.analysisGroups.size && this.analysisGroupsVisibility) {
                this.handleAnalysisGroupsVisibleChanged();
              }
            },
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

  private populateTimeline() {
    // start video & timeline load
    let subtitlesLoaded$ = new Subject<void>();
    let appAudioLoaded$ = new Subject<void>();
    let timelineExceptTextTracksCreated$ = new Subject<TimelineLaneApi[]>();
    let timelineTextTracksCreated$ = new Subject<TimelineLaneApi[]>();
    let timelineLanesAdded$ = new Subject<void>();
    let telemetryLanesLoaded$ = new Subject<void>();

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

    this.videoLoaded$.pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe({
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
                  next: (audioLoadedEvent) => {
                    this._audioTracks?.forEach((track, index) => {
                      // refresh references
                      const newTrack = audioLoadedEvent!.audioTracks.find((loadedTrack) => track.label === loadedTrack.label)!;
                      this._audioTracksByName?.set(newTrack.label!, newTrack);
                      this._audioTracks![index] = newTrack;
                    });

                    this._muxedAudioTracks?.forEach((track, index) => {
                      const source = this._sessionData!.media.main.find((source) => track.src === source.url)!;
                      const audioMediaTrack = this._audioMediaTracks?.find((amt) => amt.media_id === source.id);
                      const newTrack = audioLoadedEvent!.audioTracks.find((loadedTrack) => track.src === loadedTrack.src)!;

                      this._audioTracksByName!.set(audioMediaTrack!.media_id, newTrack!);
                      this._muxedAudioTracks![index] = newTrack;

                      const audioTrackIndex = this._audioTracks?.findIndex((t) => t.src === newTrack.src);

                      if (audioTrackIndex) {
                        this._audioTracks![audioTrackIndex] = newTrack;
                      }
                    });

                    this.timelineService.getAudioGroupingLanes()?.forEach((lane) => {
                      lane.audioTrack = StringUtil.isNonEmpty(lane.audioMediaTrack.media_id) ? this._audioTracksByName?.get(lane.audioMediaTrack.media_id) : void 0;
                    });

                    this.timelineService.getAudioChannelLanes()?.forEach((lane) => {
                      lane.audioTrack = StringUtil.isNonEmpty(lane.audioMediaTrack.media_id) ? this._audioTracksByName?.get(lane.audioMediaTrack.media_id) : void 0;
                    });
                  },
                });
            },
          });

        combineLatest([timelineLanesAdded$, this.sidecarAudiosLoaded$])
          .pipe(filter((p) => !!p.at(1)))
          .pipe(takeUntil(this._manifestLoadBreaker$), take(1))
          .subscribe({
            next: () => {
              this.timelineService.getAudioGroupingLanes()?.forEach((lane) => {
                const audioTrack = StringUtil.isNonEmpty(lane.audioMediaTrack.media_id) ? this._sidecarAudioTracksByName?.get(lane.audioMediaTrack.media_id) : void 0;
                if (audioTrack) {
                  lane.audioTrack = audioTrack;
                }
              });

              this.timelineService.getAudioChannelLanes()?.forEach((lane) => {
                const audioTrack = StringUtil.isNonEmpty(lane.audioMediaTrack.media_id) ? this._sidecarAudioTracksByName?.get(lane.audioMediaTrack.media_id) : void 0;
                if (audioTrack) {
                  lane.audioTrack = audioTrack;
                }
              });

              // track audio changes (triggered for example by detached window)
              this.ompApiService
                .api!.audio.onSidecarAudioCreate$.pipe(
                  takeUntil(this._manifestLoadBreaker$),
                  filter((p) => !!p)
                )
                .pipe(takeUntil(this._manifestLoadBreaker$))
                .subscribe({
                  next: (sidecarAudioCreateEvent) => {
                    const newSidecarTrack = sidecarAudioCreateEvent.createdSidecarAudioState.audioTrack;
                    this._sidecarAudioTracks = this._sidecarAudioTracks!.map((sc) => (sc.id === newSidecarTrack.id ? newSidecarTrack : sc));
                    this._sidecarAudioTracksByName!.set(newSidecarTrack.id, newSidecarTrack);

                    this.timelineService
                      .getAudioGroupingLanes()
                      ?.filter((gl) => gl.audioMediaTrack.media_id === newSidecarTrack.id)
                      ?.forEach((lane) => {
                        const audioTrack = StringUtil.isNonEmpty(lane.audioMediaTrack.media_id) ? this._sidecarAudioTracksByName?.get(lane.audioMediaTrack.media_id) : void 0;
                        if (audioTrack) {
                          lane.audioTrack = audioTrack;
                        }
                      });

                    this.timelineService
                      .getAudioChannelLanes()
                      ?.filter((cl) => cl.audioMediaTrack.media_id === newSidecarTrack.id)
                      .forEach((lane) => {
                        const audioTrack = StringUtil.isNonEmpty(lane.audioMediaTrack.media_id) ? this._sidecarAudioTracksByName?.get(lane.audioMediaTrack.media_id) : void 0;
                        if (audioTrack) {
                          lane.audioTrack = audioTrack;
                        }
                      });
                  },
                });
            },
          });

        combineLatest([timelineLanesAdded$, subtitlesLoaded$, this.sidecarTextsLoaded$])
          .pipe(filter((p) => !!p.at(2)))
          .pipe(takeUntil(this._manifestLoadBreaker$), take(1))
          .subscribe({
            next: () => {
              // track subtitle changes (triggered for example by detached window)
              combineLatest([this.ompApiService.api!.subtitles.onSubtitlesLoaded$, this.ompApiService.api!.subtitles.onCreate$])
                .pipe(
                  takeUntil(this._manifestLoadBreaker$),
                  filter((p) => !!p)
                )
                .pipe(takeUntil(this._manifestLoadBreaker$))
                .subscribe({
                  next: () => {
                    const tracks = this.ompApiService.api!.subtitles.getTracks();
                    this._subtitlesVttTracks?.forEach((track, index) => {
                      // refresh references
                      const newTrack = tracks.find((loadedTrack) => track.label === loadedTrack.label);
                      if (newTrack) {
                        this._subtitlesVttTracksByName?.set(newTrack.label!, newTrack);
                        this._subtitlesVttTracks![index] = newTrack;
                      }
                    });

                    const subtitleTrack = this.ompApiService.api!.subtitles.getTracks().find((track) => track.label === this._currentSubtitleTrackLabel);
                    if (subtitleTrack) {
                      this.ompApiService.api!.subtitles.showTrack(subtitleTrack.id);
                    }
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

        combineLatest([timelineExceptTextTracksCreated$, subtitlesLoaded$, this.sidecarTextsLoaded$])
          .pipe(filter((p) => !!p.at(2)))
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
              timelineLanes = this.orderMediaTracks(
                timelineLanes,
                this._sessionData!.presentation!.timeline.tracks.map((track) => track.id)
              );
              this.ompApiService.api!.timeline!.addTimelineLanes(timelineLanes);

              this._groupingLanes?.forEach((lane) => {
                if (lane.groupVisibility === 'minimized') {
                  lane.groupMinimize();
                }
              });

              this.hideMediaTracks(
                timelineLanes,
                this._sessionData!.presentation!.timeline.tracks.filter((track) => !track.style?.hidden).map((track) => track.id)
              );

              completeSub(timelineLanesAdded$);

              const telemetryLanes = timelineLanes.filter(
                (lane) => lane instanceof TelemetryLineChartLane || lane instanceof TelemetryBarChartLane || lane instanceof TelemetryOgChartLane || lane instanceof TelemetryMarkerLane
              ) as TelemetryLane[];
              if (telemetryLanes.length) {
                combineLatest(telemetryLanes.map((lane) => lane.onVttFileLoaded$))
                  .pipe(takeUntil(this._manifestLoadBreaker$), take(1))
                  .subscribe(() => {
                    completeSub(telemetryLanesLoaded$);
                  });
              } else {
                completeSub(telemetryLanesLoaded$);
              }

              const thumbnailLane = timelineLanes.find((lane) => lane instanceof ThumbnailLane) as ThumbnailLane | undefined;
              if (thumbnailLane) {
                thumbnailLane.onVttFileLoaded$.pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe((thumbnailVttFile) => {
                  if (this.segmentationService.markerList && !this.segmentationService.markerList.thumbnailVttFile) {
                    this.segmentationService.markerList.thumbnailVttFile = thumbnailVttFile;
                  }
                });
              }
            },
          });

        timelineLanesAdded$.pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe({
          next: () => {
            if (this.analysisGroups.size > 0 && this.sessionData?.presentation?.timeline.configuration?.visible_analysis_groups) {
              this.analysisGroupsVisibility = new Map();

              [...this._analysisGroups.keys()].forEach((key) => {
                this.analysisGroupsVisibility!.set(key, this.sessionData!.presentation!.timeline.configuration!.visible_analysis_groups!.includes(key));
              });

              this.handleAnalysisGroupsVisibleChanged();
            }

            const laneOptions =
              this.timelineService.getGroupingLanes()?.map((lane: any) => ({
                label: `${lane.description.split(' ')[0]} - ${lane._videoMediaTrack?.name ?? lane._audioMediaTrack?.name ?? lane._textMediaTrack?.name}`,
                value: lane.id,
              })) ?? [];
            this.store.dispatch(new SetLaneOptions(laneOptions));
            this.timelineLanesAdded$.next(true);
          },
        });

        telemetryLanesLoaded$.pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe({
          complete: () => {
            this.layoutService.disableSwitchModeButton$.next(false);
            this._disableSessionButtons$.next(false);
            completeSub(this.timelineReloaded$);
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
              const mainMediaSources = this._sessionData!.media.main.map((source) => source.url);
              this._muxedAudioTracks = this._audioTracks.filter((track) => mainMediaSources.includes(track.src));
              this._audioTracksByName = new Map<string, OmpAudioTrack>();
              this._audioTracks.forEach((audioTrack) => {
                this._audioTracksByName!.set(audioTrack.label!, audioTrack);
              });
              this._muxedAudioTracks.forEach((audioTrack) => {
                const source = this._sessionData!.media.main.find((source) => audioTrack.src === source.url)!;
                const audioMediaTrack = this._audioMediaTracks?.find((amt) => amt.media_id === source.id);
                this._audioTracksByName!.set(audioMediaTrack!.media_id, audioTrack);
              });
              completeSub(appAudioLoaded$);
            },
          });

        this.ompApiService.api!.audio.onSidecarAudioCreate$.pipe(takeUntil(this._manifestLoadBreaker$)).subscribe({
          next: (sidecarAudioCreateEvent: SidecarAudioCreateEvent) => {},
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
              if (this._subtitlesVttTracksByName === undefined) {
                this._subtitlesVttTracksByName = new Map<string, SubtitlesVttTrack>();
              }
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

    this._currentMainMedia = manifestId ? this._mainMedias!.find((p) => p.id === manifestId) : this._mainMedias![0];

    console.debug('Manifest selected: ', this._currentMainMedia);

    if (!this._currentMainMedia) {
      throw new Error(`Could not select master manifest with id: ${manifestId}`);
    }

    this.videoLoaded$ = new Subject<void>();

    this.populateTimeline();

    this.loadVideo()
      .pipe(takeUntil(this._manifestLoadBreaker$), take(1))
      .subscribe({
        next: () => {
          if (this._currentAudioLane && !this._currentAudioLane.isDisabled) {
            this._currentAudioLane.setAsActiveAudioTrack(false);
          }
          if (this._currentAudioTrack) {
            this.ompApiService.api!.audio.setActiveAudioTrack(this._currentAudioTrack.id);
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
                      completeSub(this.videoLoaded$);
                    });
                } else {
                  completeSub(this.videoLoaded$);
                }
              });
          } else {
            completeSub(this.videoLoaded$);
          }

          combineLatest([this.sidecarAudiosLoaded$, this.sidecarTextsLoaded$]).subscribe(([areSidecarAudiosLoaded, areSidecarTextsLoaded]) => {
            this.sidecarsLoaded$.next(areSidecarAudiosLoaded && areSidecarTextsLoaded);
          });

          this.ompApiService
            .api!.subtitles.onSubtitlesLoaded$.pipe(
              filter((p) => !!p),
              take(1),
              takeUntil(this._destroyed$)
            )
            .subscribe(() => this.loadSidecarTexts().subscribe());

          this.loadSidecarAudios().subscribe();
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
      media: z.object({
        main: z
          .array(
            z.object({
              id: z.string().optional(),
              name: z.string(),
              type: z.enum(['hls', 'mp4']),
              frame_rate: z.union([z.string(), z.number()]).optional(),
              url: z.string(),
            })
          )
          .min(1)
          .superRefine((data, ctx) => {
            data.forEach((media) => {
              if (media.type === 'mp4' && !media.id && media.frame_rate != undefined) {
                ctx.addIssue({
                  path: ['id'],
                  code: z.ZodIssueCode.custom,
                  message: "id and frame rate are required when media type is 'mp4'",
                });
              }
            });
          }),
      }),
      presentation: z.object({
        timeline: z
          .object({
            tracks: z
              .array(
                z.object({
                  type: z.string(),
                })
              )
              .min(0)
              // .max(1) // to be relaxed in future
              .optional(),
          })
          .refine(
            ({tracks}) => {
              const videoTracks = tracks?.filter((track) => track.type === 'video');
              const audioTracks = tracks?.filter((track) => track.type === 'audio');
              return (videoTracks !== undefined && videoTracks.length > 0) || (audioTracks !== undefined && audioTracks.length > 0);
            },
            {
              message: 'Either video or audio must be provided',
            }
          ),
      }),
    });

    try {
      let parse = zodObject.parse(sessionData);

      let mainMedias = sessionData.media.main.filter((p) => this.isMainMediaSupported(p));
      if (mainMedias.length < 1) {
        throw new Error(`Could not find supported master manifests`);
      }

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  private isMainMediaSupported(mainMedia: MainMedia): boolean {
    return !(this.windowService.userAgent !== 'safari' && mainMedia.color_range && mainMedia.color_range !== 'sdr');
  }

  private processScrubberLane() {
    let scrubberLane = this.ompApiService.api!.timeline!.getScrubberLane();
    scrubberLane.style = {
      ...Constants.SCRUBBER_LANE_STYLE,
      ...LayoutService.themeStyleConstants.SCRUBBER_LANE_STYLE_COLORS,
    };

    let buttonConfig: Partial<ImageButtonConfig> = {
      width: 35,
      height: 35,
      listening: true,
    };

    let zoomInButton = new ImageButton({
      ...LayoutService.themeStyleConstants.IMAGE_BUTTONS.circlePlus,
      ...buttonConfig,
    });

    let zoomOutButton = new ImageButton({
      ...LayoutService.themeStyleConstants.IMAGE_BUTTONS.circleMinus,
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
        ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS,
        // DP-CORE-TIME-4
        // TODO Since player is currently limited to a single video track, if a video track is presented it will be active. Logic will need to change in the future when support for multiple video tracks is added
        ...Constants.LABEL_LANE_STYLE_ACTIVE,
        ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_ACTIVE_COLORS,
      },
    });

    this.addGroupingLaneConfigButtonListener(lane);

    return lane;
  }

  private createAudioGroupingLane(audioMediaTrack: AudioMediaTrack, index: number, isSidecar?: boolean): AudioGroupingLane {
    let description = `A${index + 1}${audioMediaTrack.visual_reference && audioMediaTrack.visual_reference.length > 1 ? ` (${audioMediaTrack.visual_reference.length} ch)` : ``}`;

    let lane = new AudioGroupingLane({
      description: description,
      text: audioMediaTrack.name,
      audioMediaTrack: audioMediaTrack,
      isSidecar: !!isSidecar,
    });

    this.addGroupingLaneConfigButtonListener(lane);

    return lane;
  }

  private createTextTrackGroupingLane(textMediaTrack: TextMediaTrack, subtitlesVttTrack: SubtitlesVttTrack | undefined, index: number): TextTrackGroupingLane {
    // let textTrackUsageLabel = textMediaTrack.id; //DomainUtil.resolveTextTrackUsageLabel(textMediaTrack);

    // let description = `T${index + 1}${textTrackUsageLabel ? ` (${textTrackUsageLabel})` : ``}`;

    let description = `T${index + 1}`;

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

  private createAudioChannelLane(
    audioMediaTrack: AudioMediaTrack,
    visualReference: VisualReference,
    audioGroupingLane: AudioGroupingLane,
    channelIndex: number,
    channelsCount: number,
    loadingAnimationEnabled: boolean,
    isSidecar: boolean
  ): AudioChannelLane {
    let lane = new AudioChannelLane(
      {
        audioMediaTrack: audioMediaTrack,
        visualReference: visualReference,
        audioGroupingLane: audioGroupingLane,
        channelIndex: channelIndex,
        channelsCount: channelsCount,
        isSidecar: !!isSidecar,
        style: {
          ...Constants.CUSTOM_AUDIO_TRACK_LANE_STYLE,
          ...LayoutService.themeStyleConstants.CUSTOM_AUDIO_TRACK_LANE_STYLE_COLORS,
        },
        loadingAnimationEnabled,
      },
      this.windowService
    );

    return lane;
  }

  private createCustomAudioTrackLane(audioMediaTrack: AudioMediaTrack, loadingAnimationEnabled: boolean): CustomAudioTrackLane {
    let lane = new CustomAudioTrackLane({
      audioMediaTrack: audioMediaTrack,
      style: {
        ...Constants.CUSTOM_AUDIO_TRACK_LANE_STYLE,
        ...LayoutService.themeStyleConstants.CUSTOM_AUDIO_TRACK_LANE_STYLE_COLORS,
      },
      loadingAnimationEnabled,
    });
    return lane;
  }

  private populateVideoHelpMenu() {
    if (this.ompApiService.api!!.video.getHelpMenuGroups().length < 1) {
      let helpMenuGroups = OmakasePlayerUtil.getKeyboardShortcutsHelpMenuGroup(this.windowService.platform);
      helpMenuGroups.forEach((helpMenuGroup) => {
        helpMenuGroup.items = [...helpMenuGroup.items];
        this.ompApiService.api!.video.appendHelpMenuGroup(helpMenuGroup);
      });
    }
  }

  private populateWithIds<T extends {id?: string}>(tracks: T[] | undefined) {
    if (!tracks) {
      return;
    }
    tracks.forEach((track) => {
      if (!track.id) {
        track.id = CryptoUtil.uuid();
      }
    });
    return tracks;
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

  handleManifestChange(masterManifest: MainMedia) {
    let videoPreviousIsPlaying = this.ompApiService.api!.video.isPlaying();
    let captureState = () => {
      this._videoPreviousTime = this.ompApiService.api!.video.getCurrentTime();
      this._videoPreviousIsPlaying = videoPreviousIsPlaying;
      this._currentAudioTrack = this.ompApiService.api!.audio.getActiveAudioTrack();
      this._currentSubtitleTrackLabel = this.ompApiService.api!.subtitles.getActiveTrack()?.label;
      this._collapsedGroups = this.ompApiService
        .api!.timeline!.getTimelineLanes()
        .filter((lane) => (lane as BaseGroupingLane<any>).groupVisibility === 'minimized')
        .map((lane) => (lane as BaseGroupingLane<any>).description);
    };

    this.segmentationService.saveSegmentationMode();

    (this.ompApiService.api!.video.isPlaying() ? this.ompApiService.api!.video.pause().pipe(map((p) => true)) : of(true)).subscribe({
      next: () => {
        captureState();
        this.store.dispatch(new Minimize());
        this.cleanTimeline();
        this.loadManifest(masterManifest.id);

        this.timelineReloaded$.pipe(takeUntil(this._manifestLoadBreaker$)).subscribe({
          next: () => {
            if (this.isAnnotationModeVisible) {
              this.connectAnnotations();
            }
            if (this.isSegmentationModeVisible) {
              const activeTrack = this.store.selectSnapshot(SegmentationState.activeTrack);
              this.segmentationService.connectSegmentationMode(activeTrack, this._destroyed$);
            }
          },
        });
      },
    });
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

  handleAnalysisGroupsVisibleChanged() {
    let allFalse = ![...this.analysisGroupsVisibility.values()].reduce((acc, curr) => acc || curr);

    // this.analysisGroupsVisibility = visibleLanesMap;

    [...this.analysisGroupsVisibility.keys()].forEach((group) => {
      let ids = this._analysisGroups.get(group);
      if (this.analysisGroupsVisibility.get(group) || allFalse) {
        if (ids && ids.length > 0) {
          let maximizeIds = ids.filter((id) => this._analysisLaneParent.get(id)!.groupVisibility === 'maximized');
          let minimizeIds = ids.filter((id) => this._analysisLaneParent.get(id)!.groupVisibility === 'minimized');

          ids.forEach((id) => {
            const lane = this.timelineService.getTimelineLaneById(id)!;
            this._analysisLaneParent.get(id)!.unfilterLane(id);

            if (this.timelineService.isAnalyticsLane(lane)) {
              const telemetryLane = lane as TelemetryLane;
              if (telemetryLane.isHidden) {
                telemetryLane.toggleHidden();
              }
            }
          });
          this.timelineService.minimize(minimizeIds.map((id) => this.timelineService.getTimelineLaneById(id)!));
          this.timelineService.maximize(maximizeIds.map((id) => this.timelineService.getTimelineLaneById(id)!));
        }
      } else {
        if (ids && ids.length > 0) {
          this.timelineService.minimize(ids.map((id) => this.timelineService.getTimelineLaneById(id)!));
          ids.forEach((id) => {
            const lane = this.timelineService.getTimelineLaneById(id)!;
            this._analysisLaneParent.get(id)!.filterLane(id);
            if (this.timelineService.isAnalyticsLane(lane)) {
              const telemetryLane = lane as TelemetryLane;
              if (!telemetryLane.isHidden) {
                telemetryLane.toggleHidden();
              }
            }
          });
        }
      }
    });

    let lanes = this._analysisWithoutGroup.map((id) => this.timelineService.getTimelineLaneById(id)!);
    if (allFalse) {
      lanes.forEach((lane) => {
        if (this.timelineService.isAnalyticsLane(lane)) {
          const telemetryLane = lane as TelemetryLane;
          if (telemetryLane.isHidden) {
            telemetryLane.toggleHidden();
          }
        }
        this._analysisLaneParent.get(lane.id)?.unfilterLane(lane.id);
      });

      this.timelineService.minimize(lanes.filter((lane) => this._analysisLaneParent.get(lane.id)!.groupVisibility === 'minimized'));
      this.timelineService.maximize(lanes.filter((lane) => this._analysisLaneParent.get(lane.id)!.groupVisibility === 'maximized'));
    } else {
      lanes.forEach((lane) => {
        if (this.timelineService.isAnalyticsLane(lane)) {
          const telemetryLane = lane as TelemetryLane;
          if (!telemetryLane.isHidden) {
            telemetryLane.toggleHidden();
          }
        }
        this._analysisLaneParent.get(lane.id)?.filterLane(lane.id);
      });
      this.timelineService.minimize(lanes.filter((lane) => this._analysisLaneParent.get(lane.id)!.groupVisibility === 'minimized'));
    }
  }

  handleGroupingLanesVisibility(visibility: GroupingLaneVisibility) {
    this.toggleGroupingLanesCollapse(visibility);
  }

  handleTimelineConfiguratorPanelClick() {
    const mediaTrackId = this._videoMediaTracks?.at(0)?.id;
    let selectedLaneId = this._groupingLanes?.find((lane) => lane.id === mediaTrackId)?.id;
    if (!selectedLaneId) {
      selectedLaneId = this._groupingLanes?.at(0)?.id;
    }

    this.store.dispatch(new SelectConfigLane(selectedLaneId));
  }

  handleSessionChange(newSessionUrl: string) {
    (this.ompApiService.api!.video.isPlaying() ? this.ompApiService.api!.video.pause().pipe(map((p) => true)) : of(true)).subscribe({
      next: () => {
        this.router.navigate(['/'], {
          queryParams: {
            session: newSessionUrl,
          },
        });
      },
    });
  }

  private connectAnnotations() {
    const annotations = this.store.selectSnapshot(AnnotationState.annotations);
    const selectedAnnotation = this.store.selectSnapshot(AnnotationState.selectedAnnotation);
    if (annotations) {
      this.annotationService.connectAnnotationMode(annotations);
      selectedAnnotation ? this.annotationService.selectAnnotation(selectedAnnotation.id) : void 0;
    }
  }

  private cleanAnalysisGroups() {
    this.analysisGroups.clear();
    this._analysisWithoutGroup = [];
  }

  private resetMetadataNav() {
    this.metadataExplorerService.navActiveId = 'sources';
    this.metadataExplorerService.infoTabHeaderActive = false;
  }

  private performSessionCleanup() {
    this.store.dispatch(new Minimize());
    this.segmentationService.resetSegmentationMode();
    this.annotationService.resetAnnotationMode();
    delete this._videoPreviousTime;
    this.cleanTimeline();
    this.cleanAnalysisGroups();
  }

  private resetPlayer() {
    this.layoutService.disableSwitchModeButton$.next(true);
    this._disableSessionButtons$.next(true);
    this.cleanAnalysisGroups();
  }

  private toggleGroupingLanesCollapse(visibility: GroupingLaneVisibility) {
    if (this.groupingLanes) {
      let maxLaneIndexForEasing = 0; // only first one
      // ease max numForEasing lanes
      let osEased$ = this.groupingLanes.filter((p, index) => index <= maxLaneIndexForEasing && p.isEnabled).map((p) => (visibility === 'minimized' ? p.groupMinimizeEased() : p.groupMaximizeEased()));

      this.groupingLanes
        .filter((p, index) => index > maxLaneIndexForEasing && p.isEnabled)
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
        let activeIndex = audioChannelLanes.findIndex((p) => p.isSoloed);
        let newActiveIndex;
        if (activeIndex < 0) {
          newActiveIndex = type === 'next' ? 0 : audioChannelLanes.length - 1;
        } else {
          newActiveIndex = type === 'next' ? (activeIndex === audioChannelLanes.length - 1 ? 0 : activeIndex + 1) : activeIndex === 0 ? audioChannelLanes.length - 1 : activeIndex - 1;
        }

        let nextActiveTrack = audioChannelLanes[newActiveIndex];
        if (nextActiveTrack) {
          nextActiveTrack.setAsActiveAudioTrack();
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
        const formInputs = ['INPUT', 'TEXTAREA', 'OMAKASE-MARKER-LIST'];
        if (formInputs.includes(targetElement.tagName.toUpperCase())) {
          return;
        }

        // Collapse / Expand All Timeline Rows - a
        if (event.code === 'KeyA') {
          this.toggleGroupingLanesCollapse(this.groupingLanesVisibility);
          event.preventDefault();
          return;
        }

        // Toggle Next Audio Track - Shift + e
        if (event.code === 'KeyE' && event.shiftKey) {
          this.toggleAudioTrack('next');
          event.preventDefault();
          return;
        }

        // Toggle Previous Audio Track -  e
        if (event.code === 'KeyE') {
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

        // Toggle Next Channel of Active Audio Track - Shift + r
        if (event.code === 'KeyR' && event.shiftKey && !event.ctrlKey && !event.metaKey) {
          this.toggleAudioChannelTrack('next');
          event.preventDefault();
          return;
        }

        // Toggle Previous Channel of Active Audio Track-  r
        if (event.code === 'KeyR' && !event.ctrlKey && !event.metaKey) {
          this.toggleAudioChannelTrack('previous');
          event.preventDefault();
          return;
        }

        // Show / Hide Configuration Panel - g
        if (event.code === 'KeyG' && this.groupingLanes && this.groupingLanes.length > 0) {
          if (this.store.selectSnapshot(TimelineConfiguratorState.visibility) === 'maximized') {
            this.store.dispatch(new Minimize());
          } else {
            this.store.dispatch(new SelectLane(this.groupingLanes.at(0)!.id));
          }
        }
      }
    }
  }

  onNavChange(activeId: LayoutTab) {
    this.layoutService.activeTab = activeId;
  }

  get sessionData(): SessionData | undefined {
    return this._sessionData;
  }

  get groupingLanes(): BaseGroupingLane<any>[] | undefined {
    return this._groupingLanes;
  }

  get currentMainMedia(): MainMedia | undefined {
    return this._currentMainMedia;
  }

  get mainMedias(): MainMedia[] | undefined {
    return this._mainMedias;
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

  get groupingLanesVisible(): boolean {
    let isVisible = true;
    if (this._groupingLanes) {
      isVisible = !!this._groupingLanes.find((p) => p.isEnabled);
    }

    return isVisible;
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

  get timelineControlsUp(): boolean {
    return this.windowService.window.outerWidth > 1000;
  }

  get isInfoModeVisible(): boolean {
    return !!this.sessionData?.sources?.length || !!this.sessionData?.presentation?.info_tabs?.length;
  }

  get isAnnotationModeVisible(): boolean {
    return !!this.sessionData?.presentation?.layout?.annotations;
  }

  get isSegmentationModeVisible(): boolean {
    return !!this.sessionData?.presentation?.layout?.segmentation;
  }

  get showTabs(): boolean {
    let tabCount = 0;
    if (this.isInfoModeVisible) tabCount++;
    if (this.isAnnotationModeVisible) tabCount++;
    if (this.isSegmentationModeVisible) tabCount++;
    return tabCount > 1;
  }

  get audioMediaTracks(): AudioMediaTrack[] | undefined {
    return this._audioMediaTracks;
  }
}
