import {AfterViewInit, Component, HostBinding, Input, OnDestroy, OnInit} from '@angular/core';
import {CryptoUtil} from '../../../../util/crypto-util';
import {Subject, takeUntil} from 'rxjs';
import {ControlBarVisibility, DefaultThemeControl, OmakasePlayerConfig, PlayerChromingTheme} from '@byomakase/omakase-player';
import {OmpApiService} from '../omp-api.service';
import {Constants} from '../../../constants/constants';

@Component({
    selector: 'div[appOmakasePlayerVideoDetached]',
    imports: [],
    template: ` <div>radi</div>`
})
export class OmakasePlayerVideoDetachedComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input('config')
  config: Partial<OmakasePlayerConfig> | undefined;

  private _onDestroy$ = new Subject<void>();

  constructor(protected ompApiService: OmpApiService) {
    this.config = Constants.OMAKASE_PLAYER_DETACHED_CONFIG;
  }

  ngOnInit(): void {
    let possibleConfig: Partial<OmakasePlayerConfig> = {
      playerHTMLElementId: CryptoUtil.uuid(),
      playerChroming: {
        theme: PlayerChromingTheme.Default,
        themeConfig: {
          controlBarVisibility: ControlBarVisibility.Enabled,
          controlBar: [
            DefaultThemeControl.PlaybackRate,
            DefaultThemeControl.Volume,
            DefaultThemeControl.TenFramesBackward,
            DefaultThemeControl.FrameBackward,
            DefaultThemeControl.Play,
            DefaultThemeControl.FrameForward,
            DefaultThemeControl.TenFramesForward,
            DefaultThemeControl.Bitc,
            DefaultThemeControl.Detach,
            DefaultThemeControl.Fullscreen,
            DefaultThemeControl.Scrubber,
          ],
        },
        styleUrl: './assets/css/chroming.css',
      },
    };

    // ensure playerHTMLElementId is set because it has to be in component template before OmakasePlayer instantiation
    if (this.config && !this.config.playerHTMLElementId) {
      this.config = {
        ...this.config,
        ...possibleConfig,
      };
    } else if (!this.config) {
      this.config = {
        ...possibleConfig,
      };
    } else {
      // config is set and config.playerHTMLElementId is set, continue
    }
  }

  ngAfterViewInit() {
    this.ompApiService.create(this.config);

    this.ompApiService.api!.video.onVideoLoaded$.pipe(takeUntil(this._onDestroy$)).subscribe({
      next: () => {
        if (!this.ompApiService.api!.video.isFullscreen()) {
          window.resizeTo(
            this.ompApiService.api!.video.getHTMLVideoElement().getBoundingClientRect().width,
            this.ompApiService.api!.video.getHTMLVideoElement().getBoundingClientRect().height + window.outerHeight - window.innerHeight
          );
        }
      },
    });
  }

  ngOnDestroy() {
    this._onDestroy$.next();
    this._onDestroy$.complete();
    this.ompApiService.destroy();
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return this.config?.playerHTMLElementId;
  }
}
