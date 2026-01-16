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

import {AfterViewInit, Component, ElementRef, HostBinding, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {animate, AnimationEvent, state, style, transition, trigger} from '@angular/animations';
import {Select, Store} from '@ngxs/store';
import {filter, map, Observable, skip, Subject, take, takeUntil} from 'rxjs';
import {VuMeterState, VuMeterStateModel} from './vu-meter.state';
import {VuMeterActions} from './vu-meter.actions';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import {LayoutService} from '../../../core/layout/layout.service';
import {completeSub} from '../../../util/rx-util';
import {IconModule} from '../../../shared/components/icon/icon.module';
import {AudioMediaTrack} from '../../../model/domain.model';
import {PeakMeterConfig, VuMeter, VuMeterApi} from '@byomakase/vu-meter';
import {DomainUtil} from '../../../util/domain-util';
import {AudioSwitchedEvent, RouterVisualizationApi, SidecarAudioChangeEvent} from '@byomakase/omakase-player';
import Minimize = VuMeterActions.Minimize;
import Maximize = VuMeterActions.Maximize;
import {RouterVisualizationConfig, RouterVisualizationTrack} from '@byomakase/omakase-player/dist/router-visualization/router-visualization';
import {WindowService} from '../../../core/browser/window.service';

const animateDurationMs = 300;
const animateTimings = `${animateDurationMs}ms ease-in-out`;

const vuMeterSingleBarWidth = 25;
const vuMeterScaleWidth = 30;
let audioRouterWidth = 400;

const peakMeterConfigDark: Partial<PeakMeterConfig> = {
  vertical: true,
  maskTransition: '0.1s',
  peakHoldDuration: 0,
  dbTickSize: 10,
  borderSize: 7,
  fontSize: 12,
  dbRangeMin: -60,
  dbRangeMax: 0,

  backgroundColor: 'rgba(0,0,0,0)', // transparent
  tickColor: '#70849A',
  labelColor: '#70849A',
  gradient: ['#F3C6B3 0%', '#E2BDB2 33%', '#D5B5B2 50%', '#C2AAB1 59%', '#A499B1 78%', '#8D8BB0 93%', '#747DAF 100%'],
};

const peakMeterConfigLight: Partial<PeakMeterConfig> = {
  ...peakMeterConfigDark,
  backgroundColor: '#F4F5F5',
  tickColor: '#5D6B7E',
  labelColor: '#5D6B7E',
  gradient: ['#A2CA69 0%', '#A2CA69 33%', '#A2CA69 50%', '#A2CA69 59%', '#A2CA69 78%', '#A2CA69 93%', '#A2CA69 100%'],
};

@Component({
    selector: 'div[appVuMeter]',
    imports: [CoreModule, SharedModule, IconModule],
    template: `
    <div
      class="vu-meter-frame d-flex flex-column h-100"
      [class.minimized]="(animationState | async) === 'minimized'"
      [class.maximized]="(animationState | async) === 'maximized'"
      [@toggleMinimizeMaximize]="{
        value: (animationState | async),
        params: {minimizedWidth: minimizedWidth, maximizedWidth: maximizedWidth},
      }"
      (@toggleMinimizeMaximize.start)="onAnimationEventStart($event)"
      (@toggleMinimizeMaximize.done)="onAnimationEventDone($event)"
    >
      <div class="vu-meter-header">
        <div class="d-flex h-100">
          <div class="btn-group" role="group">
            <button type="button" class="btn btn-maximize-minimize" (click)="toggleMinimizeMaximize()">
              <i [appIcon]="(animationState | async) === 'minimized' ? 'double-chevron-left' : 'double-chevron-right'"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="vu-meter-eq flex-grow-1">
        <div class="d-flex flex-row h-100">
          <div #audioRouter id="omakase-audio-router" [class.minimized]="(animationState | async) === 'minimized'" [class.maximized]="(animationState | async) === 'maximized'"></div>
          <div class="d-flex flex-column flex-grow-1 justify-content-end h-100">
            <div class="web-audio-peak-meter flex-grow-1" #vuMeter></div>
            <div class="channel-labels d-flex justify-content-between">
              <div></div>
              <div>L</div>
              <div>R</div>
              <div>C</div>
              <div>LFE</div>
              <div>LS</div>
              <div>RS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    animations: [
        trigger('toggleMinimizeMaximize', [
            state('minimized', style({
                width: `{{minimizedWidth}}px`,
            }), { params: { minimizedWidth: 0 } }),
            state('maximized', style({
                width: `{{maximizedWidth}}px`,
            }), { params: { maximizedWidth: 0 } }),
            transition('* => *', [animate(animateTimings)]),
        ]),
    ]
})
export class VuMeterComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('vuMeter') vuMeterElementRef!: ElementRef;
  @ViewChild('audioRouter') audioRouterElementRef!: ElementRef;

  @Select(VuMeterState) state$!: Observable<VuMeterStateModel>;

  @Input() audioMediaTracks?: AudioMediaTrack[];

  private _routerVisualization?: RouterVisualizationApi;
  private _vuMeter?: VuMeterApi;

  private _activeTrack?: AudioMediaTrack;
  private _currentSidecarTrackId?: string;

  private _minimizedWidth: number = vuMeterSingleBarWidth * 6;
  private _maximizedWidth: number = this._minimizedWidth;

  private _destroyed$ = new Subject<void>();

  constructor(
    protected store: Store,
    protected ompApiService: OmpApiService,
    protected layoutService: LayoutService,
    protected windowService: WindowService,
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.ompApiService.onCreate$
      .pipe(
        filter((p) => !!p),
        take(1)
      )
      .subscribe({
        next: () => {
          setTimeout(() => {
            this.layoutService.presentationMode$.pipe(takeUntil(this._destroyed$)).subscribe({
              next: (presentationMode) => {
                let peakMeterConfig = presentationMode === 'dark' ? peakMeterConfigDark : peakMeterConfigLight;

                let createAttachedDetachedModeFilter = <T>() => {
                  return filter<T>(() => this.ompApiService.api!.video.getVideoWindowPlaybackState() === 'attached' || this.ompApiService.api!.video.getVideoWindowPlaybackState() === 'detached');
                };

                let updateRouterVisualization = () => {
                  if (!this._currentSidecarTrackId) {
                    let activeAudioTrack = this.ompApiService.api!.audio.getActiveAudioTrack();
                    const audioMediaTrack = this.audioMediaTracks?.find((track) => activeAudioTrack?.label?.startsWith(track.media_id));
                    if (audioMediaTrack && audioMediaTrack.visual_reference && this._activeTrack !== audioMediaTrack) {
                      let visualReferencesInOrder = DomainUtil.resolveAudioMediaTrackVisualReferencesInOrder(audioMediaTrack);

                      this._routerVisualization?.updateMainTrack({
                        inputLabels: visualReferencesInOrder!.map((visualReference, index) => visualReference.channel ?? `C${index + 1}`),
                      });
                    }
                  }
                };

                let initializeSidecarRouterVisualization = () => {
                  const id = this.isActiveTrackSidecar ? this.activeAudioTrack!.id : undefined;
                  if (id !== this._currentSidecarTrackId) {
                    this.tryCreateVuMeter(peakMeterConfig);
                    this.tryCreateRouterVisualization();
                    this._currentSidecarTrackId = id;
                  }
                }

                this.ompApiService
                  .api!.video.onVideoLoaded$.pipe(takeUntil(this._destroyed$))
                  .pipe(filter(p => !!p))
                  .pipe(createAttachedDetachedModeFilter())
                  .subscribe((event) => {
                    this.tryCreateRouterVisualization();
                    this.tryCreateVuMeter(peakMeterConfig);
                  });

                this.ompApiService
                  .api!.video.onVideoWindowPlaybackStateChange$.pipe(takeUntil(this._destroyed$))
                  .pipe(createAttachedDetachedModeFilter())
                  .subscribe((event) => {
                    updateRouterVisualization();
                  });

                this.ompApiService
                  .api!.audio.onAudioSwitched$.pipe(takeUntil(this._destroyed$))
                  .pipe(createAttachedDetachedModeFilter<AudioSwitchedEvent>())
                  .subscribe((event) => {
                    updateRouterVisualization();
                  });

                this.ompApiService
                  .api!.audio.onSidecarAudioChange$.pipe(takeUntil(this.layoutService.presentationMode$.pipe(skip(1))))
                  .pipe(takeUntil(this._destroyed$))
                  .pipe(createAttachedDetachedModeFilter<SidecarAudioChangeEvent>())
                  .subscribe((event) => {
                    initializeSidecarRouterVisualization();
                  });
              },
            });
          });
        },
      });
  }

  ngOnDestroy() {
    completeSub(this._destroyed$);
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'vu-meter';
  }

  private tryCreateVuMeter(peakMeterConfig: Partial<PeakMeterConfig>) {
    let channelCount = 6;

    this.minimizedWidth = channelCount * vuMeterSingleBarWidth;
    this.maximizedWidth = this.minimizedWidth + vuMeterScaleWidth + 14 + audioRouterWidth;
    this.vuMeterElementRef.nativeElement.innerHTML = '';

    if (this._vuMeter) {
      this._vuMeter.destroy();
      this._vuMeter = void 0;
    }

    this._vuMeter = new VuMeter(channelCount, this.vuMeterElementRef.nativeElement, peakMeterConfig).attachSource(this.createVuMeterSource());
  }

  private tryCreateRouterVisualization() {
    if (this._routerVisualization) {
      this._routerVisualization.destroy()
    }

    let outputNumber;
    if (this.ompApiService.api!.video.getVideoWindowPlaybackState() === 'detached') {
      outputNumber = this._currentSidecarTrackId
        ? this.ompApiService.api!.audio.getSidecarAudioState(this._currentSidecarTrackId)!.audioRouterState!.outputsNumber
        : this.ompApiService.api!.audio.getMainAudioState()!.audioRouterState!.outputsNumber;
    } else {
      outputNumber = this.ompApiService.api!.audio.getAudioContext().destination.maxChannelCount >= 6 ? 6 : 2;
    }
    audioRouterWidth = outputNumber === 6 ? 440 : 290;
    this.audioRouterElementRef.nativeElement.style.width = `${audioRouterWidth}px`;

    const audioMediaTrack = this.audioMediaTracks?.find((track) => this.activeAudioTrack?.label?.startsWith(track.media_id));

    let routerVisualizationConfig: RouterVisualizationConfig = {
      size: 'large',
      outputNumber,
      routerVisualizationHTMLElementId: 'omakase-audio-router',
      outputLabels: ['L', 'R', 'C', 'LFE', 'LS', 'RS'],
    }

    let routerVisualizationTrack: RouterVisualizationTrack = {
      inputNumber: audioMediaTrack ? DomainUtil.resolveChannelNrFromChannelLayout(audioMediaTrack) : 2,
      maxInputNumber: 6,
      inputLabels: ['L', 'R', 'C', 'LFE', 'LS', 'RS'],
    }

    if (this.ompApiService.api!.audio.getActiveSidecarAudioTracks().length === 0) {
      routerVisualizationConfig = {
        ...routerVisualizationConfig,
        mainTrack: routerVisualizationTrack,
      }
    } else {
      const id = this.activeAudioTrack!.id;
      routerVisualizationConfig = {
        ...routerVisualizationConfig,
        sidecarTracks: [
          {
            trackId: id,
            ...routerVisualizationTrack
          },
        ],
      }
      this._currentSidecarTrackId = id;
    }

    this._routerVisualization = this.ompApiService.api!.initializeRouterVisualization(routerVisualizationConfig)

    // @ts-ignore
    window['rv'] = this._routerVisualization;
  }

  toggleMinimizeMaximize() {
    if (this.store.selectSnapshot(VuMeterState.visibility) === 'minimized') {
      this.maximize();
    } else {
      this.minimize();
    }
  }

  minimize() {
    this.store.dispatch(new Minimize());
  }

  maximize() {
    this.store.dispatch(new Maximize());
  }

  createVuMeterSource() {
    const activeSidecars = this.ompApiService.api!.audio.getActiveSidecarAudioTracks();

    if (activeSidecars.length === 0) {
      return this.ompApiService.api!.audio.createMainAudioPeakProcessor();
    } else {
      return this.ompApiService.api!.audio.createSidecarAudioPeakProcessor(activeSidecars.at(0)!.id);
    }
  }

  onAnimationEventStart(event: AnimationEvent) {}

  onAnimationEventDone(event: AnimationEvent) {}

  get animationState(): Observable<string> {
    return this.state$.pipe(
      take(1),
      map((p) => p.visibility)
    );
  }

  get activeAudioTrack() {
    const activeSidecars = this.ompApiService.api!.audio.getActiveSidecarAudioTracks();
    if (activeSidecars.length > 0) {
      return activeSidecars.at(0);
    } else {
      return this.ompApiService.api!.audio.getActiveAudioTrack();
    }
  }

  get isActiveTrackSidecar() {
    return this.ompApiService.api!.audio.getActiveSidecarAudioTracks().length > 0;
  }

  get minimizedWidth(): number {
    return this._minimizedWidth;
  }

  set minimizedWidth(value: number) {
    this._minimizedWidth = value;
  }

  get maximizedWidth(): number {
    return this._maximizedWidth;
  }

  set maximizedWidth(value: number) {
    this._maximizedWidth = value;
  }
}
