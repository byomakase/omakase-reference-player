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
import {ImageButton, ImageButtonConfig, OmakasePlayerApi, SubtitlesLoadedEvent, SubtitlesVttTrack, TimelineApi} from '@byomakase/omakase-player';
import {BehaviorSubject, combineLatest, filter, forkJoin, fromEvent, Observable, Subject, take, takeUntil} from 'rxjs';
import {Constants} from '../../shared/constants/constants';
import {CoreModule} from '../../core/core.module';
import {SharedModule} from '../../shared/shared.module';
import {TimelineConfiguratorComponent} from './timeline-configurator/timeline-configurator.component';
import {ActivatedRoute, Event} from '@angular/router';
import {StringUtil} from '../../util/string-util';
import {UrlUtil} from '../../util/url-util';
import {MainService} from './main.service';
import {z} from 'zod';
import {AudioMediaTrack, BasicAuthenticationData, BearerAuthenticationData, Channel, MasterManifest, SessionData, TextMediaTrack, VideoMediaTrack} from '../../model/domain.model';
import {DomainUtil} from '../../util/domain-util';
import {TimelineService} from '../timeline/timeline.service';
import {ErrorData, MediaPlaylist} from 'hls.js';
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
import {MetadataExplorerComponent} from './metadata-explorer/metadata-explorer.component';
import {VuMeterComponent} from './vu-meter/vu-meter.component';
import {TelemetryComponent} from './telemetry/telemetry.component';
import {CustomAudioTrackLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/custom-audio-track-lane';
import {Store} from '@ngxs/store';
import {AppActions} from '../../shared/state/app.actions';
import {ChartLegendComponent} from './chart-legend/chart-legend.component';
import {TimelineConfiguratorState} from './timeline-configurator/timeline-configurator.state';
import {TimelineConfiguratorActions} from './timeline-configurator/timeline-configurator.actions';
import ShowExceptionModal = AppActions.ShowExceptionModal;
import SelectConfigLane = TimelineConfiguratorActions.SelectLane;
import SetConfigLaneOptions = TimelineConfiguratorActions.SetLaneOptions;

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  standalone: true,
  imports: [
    CoreModule,
    SharedModule,
    TimelineConfiguratorComponent,
    MetadataOffcanvasComponent,
    MetadataExplorerComponent,
    VuMeterComponent,
    TelemetryComponent,
    ChartLegendComponent
  ]
})
export class MainComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(OmakasePlayerVideoComponent) appOmakasePlayerVideo?: OmakasePlayerVideoComponent;
  @ViewChild(VuMeterComponent) vuMeter!: VuMeterComponent;

  @ViewChild('northPole') northPoleElementRef!: ElementRef;
  @ViewChild('metadataExplorerWrapper') metadataExplorerWrapperElementRef!: ElementRef;
  @ViewChild('telemetryWrapper') telemetryWrapperElementRef!: ElementRef;
  @ViewChild('playerWrapperInner') playerWrapperInnerElementRef!: ElementRef;

  OmakasePlayerConstants = Constants;

  showMetadata$ = new BehaviorSubject<boolean>(false);
  showPlayer$ = new BehaviorSubject<boolean>(false);
  timelineLoaded$ = new BehaviorSubject<boolean>(false);

  private _omakasePlayerApi: OmakasePlayerApi | undefined;

  private _omakasePlayerVideoPlayerReady$ = new BehaviorSubject<boolean>(false);
  private _omakasePlayerTimelineReady$ = new BehaviorSubject<boolean>(false);
  private _omakasePlayerSubtitlesLoaded$ = new Subject<SubtitlesLoadedEvent>();

  private _onAudioSwitched$ = new Subject<MediaPlaylist>()

  private _destroyed$ = new Subject<void>();

  private _sessionData?: SessionData;
  private _masterManifests?: MasterManifest[]; // only supported manifests
  private _currentMasterManifest?: MasterManifest;
  private _currentAudioTrack?: MediaPlaylist;
  private _currentAudioLane?: AudioGroupingLane | AudioChannelLane;
  private _collapsedGroups: string[] = [];

  /**
   * Last video time before video load, undefined on first load
   *
   * @private
   */
  private _videoPreviousTime: number | undefined;

  private _videoMediaTracks?: VideoMediaTrack[];
  private _audioMediaTracks?: AudioMediaTrack[];
  private _textMediaTracks?: TextMediaTrack[];

  // after video load fields are populated using Omakase Video API with VideoHlsController, thus variables can be safely cast to hls.js types
  private _hlsMediaPlaylists?: MediaPlaylist[];
  private _hlsMediaPlaylistsByName?: Map<string, MediaPlaylist>;
  private _onHlsMediaPlaylistsLoaded$ = new Subject<MediaPlaylist[]>();

  private _subtitlesVttTracks?: SubtitlesVttTrack[]
  private _subtitlesVttTracksByName?: Map<string, SubtitlesVttTrack>;

  private _zoomInProgress = false;

  private _groupingLanes?: BaseGroupingLane<any>[];


  private _manifestLoadBreaker$ = new Subject<void>();

  constructor(protected route: ActivatedRoute,
              protected mainService: MainService,
              protected timelineService: TimelineService,
              protected windowService: WindowService,
              protected renderer: Renderer2,
              protected store: Store) {

    fromEvent<Event>(this.windowService.window, 'resize').pipe(takeUntil(this._destroyed$)).subscribe(event => {
      this.adjustMetadataExplorerStyles();
    })

    this._omakasePlayerTimelineReady$.pipe(takeUntil(this._destroyed$), filter(p => p), take(1)).subscribe({
      next: () => {
        this._omakasePlayerApi!.timeline!.onTimecodeClick$.pipe(takeUntil(this._destroyed$)).subscribe((event) => {
          this._omakasePlayerApi!.video.seekToTimecode(event.timecode).subscribe()
        })

        this.processScrubberLane();
      }
    })

  }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this._destroyed$)).subscribe(queryParams => {
      let sessionUrl = queryParams['session'];
      let manifestId = queryParams['manifest']

      if (StringUtil.isNonEmpty(sessionUrl) && UrlUtil.isValid(sessionUrl)) {
        this.mainService.fetchBootstrapPayload(sessionUrl).subscribe({
          next: (sessionData) => {

            if (!sessionData) {
              throw new Error('Could not load bootstrap data')
            }

            let sessionDataValid = this.validateSessionData(sessionData);

            if (sessionDataValid) {
              this.showPlayer$.next(true);
            } else {
              throw new Error('Bootstrap loaded succesfully, but some of the validations failed')
            }

            this._sessionData = sessionData;
            this._masterManifests = this._sessionData.data.master_manifests.filter(p => this.isManifestSupported(p));

            this.showMetadata$.next(true);

            this.loadManifest(manifestId);

          },
          error: err => {
            throw new Error(`Error loading bootstrap data from session url: ${sessionUrl}`)
          }
        })
      } else {
        throw new Error('Session URL not provided or invalid')
      }
    })
  }

  ngAfterViewInit() {
    this.adjustMetadataExplorerStyles();
  }

  ngOnDestroy() {
    completeSub(this._manifestLoadBreaker$);
    completeSub(this._destroyed$);
  }

  onOmakasePlayerVideoReady(omakasePlayerApi: OmakasePlayerApi) {
    setTimeout(() => {
      this._omakasePlayerApi = omakasePlayerApi;

      this.omakasePlayerApi!.alerts.configure({ duration: 3000 });

      if (this._masterManifests!.length < this._sessionData!.data.master_manifests.length) {
        this.omakasePlayerApi!.alerts.warn('HDR playback not supported on this platform. Use Safari to view HDR options.', { autodismiss: true });
      }

      this.timelineService.omakasePlayerApi = omakasePlayerApi;

      this._omakasePlayerVideoPlayerReady$.next(true);
    })
  }

  onOmakasePlayerTimelineReady(timelineApi: TimelineApi) {
    this._omakasePlayerTimelineReady$.next(true);
  }

  onOmakasePlayerSubtitlesLoaded(event: SubtitlesLoadedEvent) {
    this._omakasePlayerSubtitlesLoaded$.next(event);
  }

  private loadVideo(): Observable<void> {
    return new Observable<void>(o$ => {
      let frameRate = DomainUtil.resolveFrameRate(this._currentMasterManifest!, this._videoMediaTracks);
      this._omakasePlayerApi!.loadVideo(this._currentMasterManifest!.url, frameRate, {
        dropFrame: isNullOrUndefined(this._currentMasterManifest!.drop_frame) ? false : this._currentMasterManifest!.drop_frame,
        ffom: isNullOrUndefined(this._currentMasterManifest!.ffom) ? void 0 : this._currentMasterManifest!.ffom,
        authentication: this._sessionData?.authentication as BasicAuthenticationData | BearerAuthenticationData
      }).pipe(take(1)).subscribe({

        next: (video) => {
          // populate audio tracks from hls stream
          this._hlsMediaPlaylists = this._omakasePlayerApi!.video.getAudioTracks() as MediaPlaylist[];
          this._hlsMediaPlaylistsByName = new Map<string, MediaPlaylist>();
          this._hlsMediaPlaylists.forEach(hlsMediaPlaylist => {
            this._hlsMediaPlaylistsByName!.set(hlsMediaPlaylist.name, hlsMediaPlaylist);
          });

          this._onHlsMediaPlaylistsLoaded$.next(this._hlsMediaPlaylists);

          if (this.isVuMeterSupported) {
            this.vuMeter.mediaElement = this._omakasePlayerApi!.video.getHTMLVideoElement();
          }

          this.populateVideoHelpMenu();

          this.omakasePlayerApi!.video.onAudioSwitched$.pipe(takeUntil(this._manifestLoadBreaker$)).subscribe({
            next: (event) => {
              this._onAudioSwitched$.next(event.audioTrack as MediaPlaylist)
            }
          })

          // @ts-ignore
          this.omakasePlayerApi!.video.getHls().on('hlsError', this.hlsFragLoadErrorHandler);

          completeSub(o$);
        }
      })
    })
  }

  private loadSubtitles(): Observable<void> {
    return new Observable<void>(o$ => {
      this._omakasePlayerApi!.subtitles.onSubtitlesLoaded$.pipe(filter(p => !!p), take(1)).subscribe((event) => {
        // populate text tracks from hls stream
        this._subtitlesVttTracks = this._omakasePlayerApi!.subtitles.getTracks();
        this._subtitlesVttTracksByName = new Map<string, SubtitlesVttTrack>();
        this._subtitlesVttTracks.forEach(subtitlesVttTrack => {
          this._subtitlesVttTracksByName!.set(subtitlesVttTrack.label, subtitlesVttTrack);
        });

        completeSub(o$);
      })
    })
  }

  private cleanTimeline(): void {
    this._omakasePlayerApi?.timeline?.removeTimelineLanes(this._omakasePlayerApi?.timeline?.getTimelineLanes().map(p => p.id))
  }

  private processVideoMediaTracks() {
    let timeline = this._omakasePlayerApi!.timeline!;

    if (this._videoMediaTracks && this._videoMediaTracks.length > 0) {
      this._videoMediaTracks.forEach((videoMediaTrack, index) => {

        let groupingLane = this.createVideoGroupingLane(videoMediaTrack, index);
        timeline.addTimelineLane(groupingLane);
        this._groupingLanes!.push(groupingLane);

        if (videoMediaTrack.visual_reference && videoMediaTrack.visual_reference.length > 0) {
          videoMediaTrack.visual_reference.forEach((visualReference) => {
            let lane = this.timelineService.createLaneByVisualReference(visualReference);
            timeline.addTimelineLane(lane)
            groupingLane.addChildLane(lane);
          })
        }

        if (videoMediaTrack.analysis && videoMediaTrack.analysis.length > 0) {
          let analysisLanes = this.timelineService.createAnalysisLanes(videoMediaTrack.analysis);
          analysisLanes.forEach(lane => {
            timeline.addTimelineLane(lane);
            groupingLane.addChildLane(lane);
          })
        }

        if (this._collapsedGroups.includes(groupingLane.description)) {
          groupingLane.groupMinimize();
        }
      })
    }
  }

  private processAudioMediaTracks() {
    let timeline = this._omakasePlayerApi!.timeline!;
    this._currentAudioLane = undefined;

    if (this._audioMediaTracks && this._audioMediaTracks.length > 0) {
      let defaultTrackSet = false;

      this._audioMediaTracks.forEach((audioMediaTrack, index) => {
        let audioGroupingLane = this.createAudioGroupingLane(audioMediaTrack, index);
        timeline.addTimelineLane(audioGroupingLane);
        this._groupingLanes!.push(audioGroupingLane);

        if (audioMediaTrack.program_name === this._currentAudioTrack?.name) {
          this._currentAudioLane = audioGroupingLane;
        }

        if (!defaultTrackSet && !audioGroupingLane.isDisabled) {
          audioGroupingLane.setAudioTrack(false);
          defaultTrackSet = true;
        }

        let channelsInOrder = DomainUtil.resolveAudioMediaTrackChannelsInOrder(audioMediaTrack);
        let isAudioChannelLane = () => {
          return channelsInOrder && channelsInOrder.length > 0;
        }

        let isCustomAudioTrackLane = () => {
          return (!channelsInOrder || channelsInOrder.length === 0) && audioMediaTrack.visual_reference && audioMediaTrack.visual_reference.find(p => p.type === 'waveform');
        }

        if (isAudioChannelLane()) {
          channelsInOrder!.forEach((channel, index) => {
            let audioChannelLane = this.createAudioChannelLane(audioMediaTrack, channel, index, channelsInOrder!.length);
            timeline.addTimelineLane(audioChannelLane);
            audioGroupingLane.addChildLane(audioChannelLane);

            if (audioChannelLane.name === this._currentAudioTrack?.name) {
              this._currentAudioLane = audioChannelLane;
            }

            if (!defaultTrackSet && !audioChannelLane.isDisabled) {
              audioChannelLane.setAudioTrack(false);
              defaultTrackSet = true;
            }
          })
        } else if (isCustomAudioTrackLane()) {
          let customAudioTrackLane = this.createCustomAudioTrackLane(audioMediaTrack);
          timeline.addTimelineLane(customAudioTrackLane);
          audioGroupingLane.addChildLane(customAudioTrackLane);
        }

        if (audioMediaTrack.analysis && audioMediaTrack.analysis.length > 0) {
          let analysisLanes = this.timelineService.createAnalysisLanes(audioMediaTrack.analysis);
          analysisLanes.forEach(lane => {
            timeline.addTimelineLane(lane);
            audioGroupingLane.addChildLane(lane);
          })
        }

        if (this._collapsedGroups.includes(audioGroupingLane.description)) {
          audioGroupingLane.groupMinimize();
        }

      })
    }
  }

  private processTextTracks() {
    let timeline = this._omakasePlayerApi!.timeline!;

    if (this._textMediaTracks && this._textMediaTracks.length > 0) {
      let defaultTrackSet = false;

      this._textMediaTracks.forEach((textMediaTrack, index) => {
        let subtitlesVttTrack = StringUtil.isNonEmpty(textMediaTrack.program_name) ? this._subtitlesVttTracksByName?.get(textMediaTrack.program_name) : void 0;

        let textTrackGroupingLane = this.createTextTrackGroupingLane(textMediaTrack, subtitlesVttTrack, index);
        timeline.addTimelineLane(textTrackGroupingLane);
        this._groupingLanes!.push(textTrackGroupingLane);

        if (!defaultTrackSet && !textTrackGroupingLane.isDisabled && !this._omakasePlayerApi!.subtitles.getCurrentTrack()) {
          textTrackGroupingLane.setTextTrack();
          defaultTrackSet = true;
        }

        if (subtitlesVttTrack) {
          let lane = this.timelineService.createSubtitlesLane(subtitlesVttTrack);
          timeline.addTimelineLane(lane);
          textTrackGroupingLane.addChildLane(lane)
        }

        if (textMediaTrack.analysis && textMediaTrack.analysis.length > 0) {
          let analysisLanes = this.timelineService.createAnalysisLanes(textMediaTrack.analysis);
          analysisLanes.forEach(lane => {
            timeline.addTimelineLane(lane);
            textTrackGroupingLane.addChildLane(lane);
          })
        }

        if (this._collapsedGroups.includes(textTrackGroupingLane.description)) {
          textTrackGroupingLane.groupMinimize();
        }
      })
    }
  }

  private loadManifest(manifestId: string | undefined = void 0) {
    completeSub(this._manifestLoadBreaker$);
    this._manifestLoadBreaker$ = new Subject<void>();

    if (manifestId) {
      console.debug(`Selecting manifest with id: ${manifestId}`)
    }

    this._currentMasterManifest = manifestId ? this._masterManifests!.find(p => p.id === manifestId) : this._masterManifests![0];

    console.debug('Manifest selected: ', this._currentMasterManifest)

    if (!this._currentMasterManifest) {
      throw new Error(`Could not select master manifest with id: ${manifestId}`)
    }

    let matchesManifest = (obj: { manifest_ids: string[] }): boolean => {
      return !!obj.manifest_ids.find(p => p === this._currentMasterManifest!.id)
    }

    this._videoMediaTracks = this._sessionData!.data.media_tracks.video ? this._sessionData!.data.media_tracks.video.filter(p => matchesManifest(p)) : void 0;
    this._audioMediaTracks = this._sessionData!.data.media_tracks.audio;
    this._textMediaTracks = this._sessionData!.data.media_tracks.text;

    // start video & timeline load
    let videoPlayerReady$ = new Subject<void>();
    let timelineReady$ = new Subject<void>();
    let videoLoaded$ = new Subject<void>();
    let subtitlesLoaded$ = new Subject<void>();
    let omakaseSubtitlesLoaded$ = new Subject<void>();

    let timelineExceptTextTracksPopulated$ = new Subject<void>();
    let timelineTextTracksPopulated$ = new Subject<void>();
    let timelinePopulated$ = new Subject<void>();

    this._manifestLoadBreaker$.pipe(take(1)).subscribe(() => {
      // remove listeners set for error handling
      // @ts-ignore
      this.omakasePlayerApi?.video.getHls().off('hlsError', this.hlsFragLoadErrorHandler)
      // this.omakasePlayerApi?.video.getHls().removeAllListeners();
    })

    this.timelineLoaded$.next(false);

    // videoPlayerReady$.subscribe({
    //   next: () => {
    //     console.log('videoPlayerReady$')
    //   }
    // })
    //
    // timelineReady$.subscribe({
    //   next: () => {
    //     console.log('timelineReady$')
    //   }
    // })
    //
    // videoLoaded$.subscribe({
    //   next: () => {
    //     console.log('videoLoaded$')
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

    timelinePopulated$.subscribe({
      next: () => {
        const laneOptions = this.timelineService.getGroupingLanes()?.map((lane: any) => ({
          label:  `${lane.description.split(' ')[0]} - ${lane._videoMediaTrack?.name ?? lane._audioMediaTrack?.name ?? lane._textMediaTrack?.name}`,
          value: lane.id
        })) ?? [];
        this.store.dispatch(new SetConfigLaneOptions(laneOptions));
        this.timelineLoaded$.next(true);
      }
    })

    videoPlayerReady$.pipe(takeUntil(this._manifestLoadBreaker$)).subscribe({
      next: () => {
        if (this._omakasePlayerApi!.video.isVideoLoaded()) {
          this._videoPreviousTime = this._omakasePlayerApi!.video.getCurrentTime();
          this._currentAudioTrack = this._omakasePlayerApi!.audio.getCurrentAudioTrack();
          this._collapsedGroups = this.omakasePlayerApi!.timeline!.getTimelineLanes().filter(lane => (lane as BaseGroupingLane<any>).groupVisibility === 'minimized').map(lane => (lane as BaseGroupingLane<any>).description);
        }

        this.loadVideo().subscribe({
          next: () => {
            if (this._currentAudioLane) {
              this._currentAudioLane.setAudioTrack(false);
            }
            if (this._videoPreviousTime !== void 0) {
              this._omakasePlayerApi!.video.seekToTime(this._videoPreviousTime).subscribe({
                error: (err) => {
                  console.error(err)
                }
              }).add(() => {
                completeSub(videoLoaded$);
              })
            } else {
              completeSub(videoLoaded$);
            }
          }
        })

        this.loadSubtitles().subscribe({
          next: () => {
            completeSub(subtitlesLoaded$);
          }
        })
      }
    })

    omakaseSubtitlesLoaded$.pipe(takeUntil(this._manifestLoadBreaker$)).subscribe({
      next: () => {
        const textTrackGroupingLanes = this.timelineService.getTextGroupingLanes();
        if (!textTrackGroupingLanes) {
          return;
        }
        textTrackGroupingLanes.forEach(lane => {
          const subtitlesVttTrack = this.omakasePlayerApi?.subtitles.getTracks().find(track => track.label === lane.subtitlesVttTrack?.label);
          if (!subtitlesVttTrack) {
            return;
          }
          const isActiveLane = this.omakasePlayerApi!.subtitles.getCurrentTrack()?.id === lane.subtitlesVttTrack?.id;
          const isCurrentTrack = this.omakasePlayerApi!.subtitles.getCurrentTrack()?.id === subtitlesVttTrack.id;
          lane.subtitlesVttTrack = subtitlesVttTrack;
          if (isActiveLane && !isCurrentTrack) {
            lane.setTextTrack();
          }
          const subtitleLane = this.timelineService.getSubtitleLaneForGroupingLane(lane);
          if (subtitleLane) {
            subtitleLane.subtitlesVttTrack = lane.subtitlesVttTrack;
          }
        })
      }
    });

    combineLatest([timelineReady$]).pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe({
      next: () => {
        this.cleanTimeline();
        this._groupingLanes = [];
        this.processVideoMediaTracks();
        this.processAudioMediaTracks();
        completeSub(timelineExceptTextTracksPopulated$);
      }
    })

    combineLatest([timelineExceptTextTracksPopulated$, subtitlesLoaded$]).pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe({
      next: () => {
        this.processTextTracks();
        completeSub(timelineTextTracksPopulated$);
      }
    })

    combineLatest([timelineExceptTextTracksPopulated$, timelineTextTracksPopulated$]).pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe({
      next: () => {
        completeSub(timelinePopulated$);
      }
    })

    combineLatest([videoPlayerReady$, timelineReady$]).pipe(takeUntil(this._manifestLoadBreaker$))
      .subscribe({
        next: () => {
          this.adjustMetadataExplorerStyles();
        }
      });

    this._omakasePlayerVideoPlayerReady$.pipe(takeUntil(this._manifestLoadBreaker$)).pipe(filter(p => p)).subscribe((event) => {
      videoPlayerReady$.next();
    })

    this._omakasePlayerTimelineReady$.pipe(takeUntil(this._manifestLoadBreaker$)).pipe(filter(p => p)).subscribe((event) => {
      timelineReady$.next();
    })

    this._omakasePlayerSubtitlesLoaded$.pipe(takeUntil(this._manifestLoadBreaker$)).subscribe(() => {
      omakaseSubtitlesLoaded$.next();
    })
  }

  private hlsFragLoadErrorHandler(hlsErrorData: ErrorData) {
    if (hlsErrorData.type === 'networkError' && hlsErrorData.details === 'fragLoadError' && hlsErrorData.fatal) {
      this.store.dispatch(new ShowExceptionModal({
        message: 'Playback stalled, could not fetch required segments from server'
      }))
    }
  }

  private validateSessionData(sessionData: SessionData): boolean {
    let zodObject = z.object({
      authentication: z.object({
        type: z.enum(['none', 'basic', 'bearer']),
        username: z.string().optional(),
        password: z.string().optional(),
        token: z.string().optional()
      }).refine(({ type, username, password }) => {
        return type !== 'basic' || username !== undefined && password !== undefined;
      }, {
        message: 'Username and password are required for basic authentication'
      }).refine(({ type, token }) => {
        return type !== 'bearer' || token !== undefined;
      }, {
        message: 'Token is required for bearer authentication'
      }).optional(),
      data: z.object({
        master_manifests: z.array(z.object({
          id: z.string(),
          name: z.string(),
          // frame_rate: z.string(),
          url: z.string()
        }))
          .min(1), // minimum of 1 master_manifest
        media_tracks: z.object({
          video: z.array(z.object({}))
            .min(0)
            .max(1) // to be relaxed in future
            .optional()
          ,
          audio: z.array(z.object({}))
            .min(0)
            .optional()
        })
          .refine(({video, audio}) => {
            return (video !== undefined && video.length > 0) || (audio !== undefined && audio.length > 0);
          }, {
            message: 'Either video or audio must be provided'
          })
      })
    });

    try {
      let parse = zodObject.parse(sessionData);

      let masterManifests = sessionData.data.master_manifests.filter(p => this.isManifestSupported(p));
      if (masterManifests.length < 1) {
        throw new Error(`Could not find supported master manifests`);
      }


      return true;
    } catch (e) {
      console.error(e)
      return false;
    }
  }

  private isManifestSupported(masterManifest: MasterManifest): boolean {
    return !(this.windowService.userAgent !== 'safari' && (masterManifest.color_range && masterManifest.color_range !== 'sdr'));
  }

  private processScrubberLane() {
    let scrubberLane = this._omakasePlayerApi!.timeline!.getScrubberLane();
    scrubberLane.style = {
      ...Constants.SCRUBBER_LANE_STYLE,
    }

    let buttonConfig: Partial<ImageButtonConfig> = {
      width: 35,
      height: 35,
      listening: true
    }

    let zoomInButton = new ImageButton({
      ...Constants.IMAGE_BUTTONS.circlePlus,
      ...buttonConfig
    })

    let zoomOutButton = new ImageButton({
      ...Constants.IMAGE_BUTTONS.circleMinus,
      ...buttonConfig
    })

    scrubberLane.addTimelineNode({
      width: zoomOutButton.config.width!,
      height: zoomOutButton.config.height!,
      justify: 'end',
      margin: [0, 0, 0, 0],
      timelineNode: zoomOutButton
    });

    scrubberLane.addTimelineNode({
      width: zoomInButton.config.width!,
      height: zoomInButton.config.height!,
      justify: 'end',
      margin: [0, -5, 0, 0],
      timelineNode: zoomInButton
    });

    zoomInButton.onClick$.subscribe({
      next: (event) => {
        if (!this._zoomInProgress) {
          this._zoomInProgress = true;
          this._omakasePlayerApi!.timeline!.zoomInEased()
            .subscribe()
            .add(() => {
              this._zoomInProgress = false;
            })
        }
      }
    })

    zoomOutButton.onClick$.subscribe({
      next: (event) => {
        if (!this._zoomInProgress) {
          this._zoomInProgress = true;
          this._omakasePlayerApi!.timeline!.zoomOutEased()
            .subscribe()
            .add(() => {
              this._zoomInProgress = false;
            })
        }
      }
    })
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
        ...Constants.LABEL_LANE_STYLE_ACTIVE
      },
    })

    this.addGroupingLaneConfigButtonListener(lane);

    return lane;
  }

  private createAudioGroupingLane(audioMediaTrack: AudioMediaTrack, index: number): AudioGroupingLane {
    let description = `A${index + 1}${audioMediaTrack.channels && audioMediaTrack.channels.length > 0 ? ` (${audioMediaTrack.channels.length} ch)` : ``}`

    let lane = new AudioGroupingLane({
      description: description,
      text: audioMediaTrack.name,
      audioMediaTrack: audioMediaTrack,
    })

    this.addGroupingLaneConfigButtonListener(lane);

    this._onHlsMediaPlaylistsLoaded$.pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe({
      next: (event) => {
        let mediaPlaylistAudioTrack = StringUtil.isNonEmpty(audioMediaTrack.program_name) ? this._hlsMediaPlaylistsByName?.get(audioMediaTrack.program_name) : void 0;
        lane.mediaPlaylistAudioTrack = mediaPlaylistAudioTrack;
      }
    })

    return lane;
  }

  private createTextTrackGroupingLane(textMediaTrack: TextMediaTrack, subtitlesVttTrack: SubtitlesVttTrack | undefined, index: number): TextTrackGroupingLane {
    let textTrackUsageLabel = DomainUtil.resolveTextTrackUsageLabel(textMediaTrack);

    let description = `T${index + 1}${textTrackUsageLabel ? ` (${textTrackUsageLabel})` : ``}`;

    let lane = new TextTrackGroupingLane({
      description: description,
      text: textMediaTrack.name,
      textMediaTrack: textMediaTrack,
      subtitlesVttTrack: subtitlesVttTrack,
    }, this._omakasePlayerApi!.subtitles)

    this.addGroupingLaneConfigButtonListener(lane);

    return lane;
  }

  private createAudioChannelLane(audioMediaTrack: AudioMediaTrack, channel: Channel, channelIndex: number, channelsCount: number): AudioChannelLane {
    let lane = new AudioChannelLane({
      channel: channel,
      channelIndex: channelIndex,
      channelsCount: channelsCount,
      style: {
        ...Constants.CUSTOM_AUDIO_TRACK_LANE_STYLE,
      }
    })

    this._onHlsMediaPlaylistsLoaded$.pipe(takeUntil(this._manifestLoadBreaker$), take(1)).subscribe({
      next: (event) => {
        let mediaPlaylistAudioTrack = StringUtil.isNonEmpty(audioMediaTrack.program_name) ? this._hlsMediaPlaylistsByName?.get(audioMediaTrack.program_name) : void 0;
        let channelMediaPlaylistAudioTrack = StringUtil.isNonEmpty(channel.program_name) ? this._hlsMediaPlaylistsByName?.get(channel.program_name) : void 0;
        lane.mediaPlaylistAudioTrack = mediaPlaylistAudioTrack;
        lane.channelMediaPlaylistAudioTrack = channelMediaPlaylistAudioTrack;
      }
    })

    return lane;
  }

  private createCustomAudioTrackLane(audioMediaTrack: AudioMediaTrack): CustomAudioTrackLane {
    let lane = new CustomAudioTrackLane({
      audioMediaTrack: audioMediaTrack,
      style: {
        ...Constants.CUSTOM_AUDIO_TRACK_LANE_STYLE,
      }
    })
    return lane;
  }

  private populateVideoHelpMenu() {
    if (this.omakasePlayerApi!.video.getHelpMenuGroups().length < 1) {
      let helpMenuGroup = OmakasePlayerUtil.getKeyboardShortcutsHelpMenuGroup(this.windowService.platform);
      helpMenuGroup.items = [...helpMenuGroup.items]
      this._omakasePlayerApi!.video.appendHelpMenuGroup(helpMenuGroup);
    }
  }

  adjustMetadataExplorerStyles() {
    if (this.northPoleElementRef && this.playerWrapperInnerElementRef && this.metadataExplorerWrapperElementRef) {
      let northPoleRect = this.northPoleElementRef.nativeElement.getBoundingClientRect()
      let playerRect = this.playerWrapperInnerElementRef.nativeElement.getBoundingClientRect();

      let newMaxWidth = northPoleRect.width - playerRect.width;
      let newMaxHeight = playerRect.height;

      this.renderer.setStyle(this.metadataExplorerWrapperElementRef.nativeElement, 'maxWidth', `${newMaxWidth}px`);
      this.renderer.setStyle(this.metadataExplorerWrapperElementRef.nativeElement, 'maxHeight', `${newMaxHeight}px`);
      if (this.telemetryWrapperElementRef) {
        this.renderer.setStyle(this.telemetryWrapperElementRef.nativeElement, 'maxHeight', `${newMaxHeight}px`);
      }

    }
  }

  handleManifestChange(masterManifest: MasterManifest) {
    this.loadManifest(masterManifest.id);
  }

  private toggleGroupingLanesCollapse() {
    if (this.groupingLanes) {
      let visibilityToToggle = this.groupingLanesVisibility;
      let maxLaneIndexForEasing = 0; // only first one
      // ease max numForEasing lanes
      let osEased$ = this.groupingLanes
        .filter((p, index) => index <= maxLaneIndexForEasing)
        .map(p => visibilityToToggle === 'minimized' ? p.groupMinimizeEased() : p.groupMaximizeEased());

      this.groupingLanes
        .filter((p, index) => index > maxLaneIndexForEasing)
        .forEach(p => {
          if (visibilityToToggle === 'minimized') {
            p.groupMinimize()
          } else {
            p.groupMaximize()
          }
        });

      forkJoin(osEased$)
        .pipe(take(1))
        .subscribe();
    }
  }

  private toggleAudioTrack(type: 'next' | 'previous') {
    let audioGroupingLanes = this._omakasePlayerApi!.timeline!.getTimelineLanes()
      .filter(p => p instanceof AudioGroupingLane)
      .map(p => p as AudioGroupingLane)
      .filter(p => !p.isDisabled);

    if (audioGroupingLanes.length > 0) {
      let activeIndex = audioGroupingLanes.findIndex(p => p.isActive);
      let newActiveIndex;
      if (activeIndex < 0) {
        newActiveIndex = type === 'next' ? 0 : audioGroupingLanes.length - 1
      } else {
        newActiveIndex = type === 'next' ? (activeIndex === (audioGroupingLanes.length - 1) ? 0 : (activeIndex + 1)) : (activeIndex === 0 ? (audioGroupingLanes.length - 1) : (activeIndex - 1));
      }
      let nextActiveTrack = audioGroupingLanes[newActiveIndex].mediaPlaylistAudioTrack;
      if (nextActiveTrack) {
        this._omakasePlayerApi!.video.setAudioTrack(nextActiveTrack.id)
      }
    }
  }

  private toggleAudioChannelTrack(type: 'next' | 'previous') {
    let activeAudioGroupingLane = this._omakasePlayerApi!.timeline!.getTimelineLanes()
      .filter(p => p instanceof AudioGroupingLane)
      .map(p => p as AudioGroupingLane)
      .find(p => p.isActive);

    if (activeAudioGroupingLane) {
      let audioChannelLanes = activeAudioGroupingLane.childLanes
        .filter(p => p instanceof AudioChannelLane)
        .map(p => p as AudioChannelLane)
        .filter(p => !p.isDisabled)

      if (audioChannelLanes.length > 0) {
        let activeIndex = audioChannelLanes.findIndex(p => p.isActive);
        let newActiveIndex;
        if (activeIndex < 0) {
          newActiveIndex = type === 'next' ? 0 : audioChannelLanes.length - 1
        } else {
          newActiveIndex = type === 'next' ? (activeIndex === (audioChannelLanes.length - 1) ? 0 : (activeIndex + 1)) : (activeIndex === 0 ? (audioChannelLanes.length - 1) : (activeIndex - 1));
        }

        let nextActiveTrack = audioChannelLanes[newActiveIndex].channelMediaPlaylistAudioTrack;
        if (nextActiveTrack) {
          this._omakasePlayerApi!.video.setAudioTrack(nextActiveTrack.id)
        }
      }
    }
  }

  private toggleTextTrack(type: 'next' | 'previous') {
    let groupingLanes = this._omakasePlayerApi!.timeline!.getTimelineLanes()
      .filter(p => p instanceof TextTrackGroupingLane)
      .map(p => p as TextTrackGroupingLane)
      .filter(p => !p.isDisabled);

    if (groupingLanes.length > 0) {
      let activeIndex = groupingLanes.findIndex(p => p.isActive);
      let newActiveIndex;
      if (activeIndex < 0) {
        newActiveIndex = type === 'next' ? 0 : groupingLanes.length - 1
      } else {
        newActiveIndex = type === 'next' ? (activeIndex === (groupingLanes.length - 1) ? 0 : (activeIndex + 1)) : (activeIndex === 0 ? (groupingLanes.length - 1) : (activeIndex - 1));
      }
      let nextActiveTrack = groupingLanes[newActiveIndex].subtitlesVttTrack;
      if (nextActiveTrack) {
        this._omakasePlayerApi!.subtitles.showTrack(nextActiveTrack.id);
      }
    }
  }

  private addGroupingLaneConfigButtonListener(lane: BaseGroupingLane<any>) {
    lane.onConfigClick$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (event) => {
        const selectedLaneId = this.store.selectSnapshot(TimelineConfiguratorState.selectedLaneId);
        this.store.dispatch(new SelectConfigLane(selectedLaneId === lane.id ? undefined : lane.id));
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (this._omakasePlayerApi) {
      let isHandled = OmakasePlayerUtil.handleKeyboardEvent(event, this._omakasePlayerApi, this.windowService.userAgent);
      if (isHandled) {
        event.preventDefault();
      } else {

        // Collapse / Expand All Timeline Rows - Ctrl + Shift + s
        if (event.code === 'KeyS' && event.shiftKey && event.ctrlKey) {
          this.toggleGroupingLanesCollapse();
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
        if (event.code === 'KeyC' && event.shiftKey) {
          this.toggleAudioChannelTrack('next');
          event.preventDefault();
          return;
        }

        // Toggle Previous Channel of Active Audio Track-  a
        if (event.code === 'KeyC') {
          this.toggleAudioChannelTrack('previous');
          event.preventDefault();
          return;
        }

      }
    }
  }

  get isVideoLoaded(): boolean {
    return this._omakasePlayerApi ? this._omakasePlayerApi.video.isVideoLoaded() : false;
  }

  get omakasePlayerApi(): OmakasePlayerApi | undefined {
    return this._omakasePlayerApi;
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

  get groupingLanesVisibility(): GroupingLaneVisibility {
    if (this.groupingLanes) {
      let minimized = this.groupingLanes.filter(p => p.groupVisibility === 'minimized');
      let maximized = this.groupingLanes.filter(p => p.groupVisibility === 'maximized');

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
}
