import {Component, HostBinding, OnDestroy, OnInit} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import {Subject, takeUntil} from 'rxjs';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AnnotationService} from '../annotation/annotation.service';

@Component({
    selector: 'div[appAnnotationCreate]',
    imports: [CoreModule, SharedModule],
    template: `<form class="annotation-create-input-wrapper" [formGroup]="formGroup" (submit)="submitAnnotation()">
    <input formControlName="text" placeholder="Add a comment..." (focus)="haltPlayback()" (blur)="resumePlayback()" />
    <div class="annotation-create-time" [class.active]="formGroup.value.timeEnabled" (click)="toggleTime()">{{ formattedCurrentTime }}</div>
    <div class="annotation-create-public" [class.active]="formGroup.value.privateEnabled" (click)="togglePrivate()">Private</div>
    <button type="submit" class="annotation-create-send" [class.active]="formGroup.valid"><i appIcon="send"></i></button>
  </form>`
})
export class AnnotationCreateComponent implements OnInit, OnDestroy {
  private _destroyed$ = new Subject<void>();
  private _formattedCurrentTime = this.formatCurrentTime(this.ompApiService.api!.video.getCurrentTime());
  private _playbackPaused = false;

  public formGroup: FormGroup = this.formBuilder.group({
    text: ['', Validators.required],
    timeEnabled: true,
    privateEnabled: false,
  });

  constructor(
    private ompApiService: OmpApiService,
    private annotationService: AnnotationService,
    private formBuilder: FormBuilder
  ) {}

  get formattedCurrentTime() {
    return this._formattedCurrentTime;
  }

  ngOnInit(): void {
    this.ompApiService.api!.video.onVideoTimeChange$.pipe(takeUntil(this._destroyed$)).subscribe((event) => {
      this._formattedCurrentTime = this.formatCurrentTime(event.currentTime);
    });
  }

  ngOnDestroy(): void {
    this._destroyed$.next();
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'annotation-create-content';
  }

  toggleTime() {
    this.formGroup.patchValue({timeEnabled: !this.formGroup.value.timeEnabled});
  }

  togglePrivate() {
    this.formGroup.patchValue({privateEnabled: !this.formGroup.value.privateEnabled});
  }

  submitAnnotation() {
    if (this.formGroup.valid) {
      if (this.formGroup.value.timeEnabled) {
        this.annotationService.addMomentMarker({time: this.ompApiService.api!.video.getCurrentTime()}, {body: this.formGroup.value.text, isPrivate: this.formGroup.value.privateEnabled});
      } else {
        this.annotationService.addAnnotation({body: this.formGroup.value.text, isPrivate: this.formGroup.value.privateEnabled});
      }
      this.formGroup.patchValue({text: ''});
    }
  }

  haltPlayback() {
    if (!this.ompApiService.api!.video.isPaused()) {
      this.ompApiService.api!.video.pause();
      this._playbackPaused = true;
    }
  }

  resumePlayback() {
    if (this._playbackPaused) {
      this.ompApiService.api!.video.play();
      this._playbackPaused = false;
    }
  }

  private formatCurrentTime(time: number): string {
    const date = new Date(0);
    date.setUTCSeconds(time);
    return date.toTimeString().slice(3, 8);
  }
}
