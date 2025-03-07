import {AnnotationActions} from './annotation.actions';
import {Injectable} from '@angular/core';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import {TimelineService} from '../../timeline/timeline.service';
import {Subject, Subscription, take} from 'rxjs';
import {
  ConfigWithOptionalStyle,
  Marker,
  MarkerApi,
  MarkerLane,
  MarkerLaneConfig,
  MarkerLaneStyle,
  MomentMarker,
  MomentMarkerConfig,
  MomentObservation,
  PeriodMarker,
  PeriodMarkerConfig,
  PeriodObservation,
} from '@byomakase/omakase-player';
import {Constants} from '../../../shared/constants/constants';
import {Store} from '@ngxs/store';
import {LayoutService} from '../../../core/layout/layout.service';
import {Annotation, AnnotationState} from './annotation.state';
import {isNullOrUndefined} from '../../../util/object-util';
import {CryptoUtil} from '../../../util/crypto-util';
import AddAnnotation = AnnotationActions.AddAnnotation;
import UpdateAnnotation = AnnotationActions.UpdateAnnotation;
import DeleteAnnotation = AnnotationActions.DeleteAnnotation;
import SelectAnnotation = AnnotationActions.SelectAnnotation;
import ResetAnnotations = AnnotationActions.ResetAnnotations;

@Injectable({
  providedIn: 'root',
})
export class AnnotationService {
  private _isInitialized = false;
  private _initSubscription?: Subscription;
  private _annotationLane?: MarkerLane;
  private _annotationColor?: string;
  private _incompleteMarker?: PeriodMarker;

  onMarkerUpdate$ = new Subject<MarkerApi>();
  onMarkerRemove$ = new Subject<string>();
  onMarkerSelected$ = new Subject<Marker>();
  onAnnotationSelected$ = new Subject<void>();

  constructor(
    protected ompApiService: OmpApiService,
    protected timelineService: TimelineService,
    protected layoutService: LayoutService,
    protected store: Store
  ) {}

  get annotationLane(): MarkerLane | undefined {
    return this._annotationLane;
  }

  get annotationColor(): string | undefined {
    return this._annotationColor;
  }

  set annotationColor(color: string) {
    this._annotationColor = color;
    if (this._annotationLane) {
      for (const marker of this._annotationLane.getMarkers()) {
        marker.style = {
          ...marker.style,
          color,
        };
      }
    }
  }

  get incompleteMarker(): PeriodMarker | undefined {
    return this._incompleteMarker;
  }

  set incompleteMarker(marker: PeriodMarker | undefined) {
    this._incompleteMarker = marker;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  initAnnotationMode() {
    if (this._isInitialized) {
      return;
    }
    if (this.ompApiService.api) {
      this.createAnnotationTrack();
      this._isInitialized = true;
    } else {
      this._initSubscription = this.timelineService.onReady$.pipe(take(1)).subscribe(() => {
        this.createAnnotationTrack();
        this._isInitialized = true;
        delete this._initSubscription;
      });
    }
  }

  resetAnnotationMode() {
    this._initSubscription?.unsubscribe();
    this.store.dispatch(new ResetAnnotations());
    this._isInitialized = false;
    delete this._incompleteMarker;
    delete this._annotationLane;
  }

  connectAnnotationMode(annotations: Annotation[]) {
    let color = this.resolveHeuristicColor();
    let style: Partial<MarkerLaneStyle> = {
      ...Constants.MARKER_LANE_STYLE,
      ...LayoutService.themeStyleConstants.MARKER_LANE_STYLE_COLORS,
      markerStyle: {
        color,
      },
    };

    this.createMarkerLaneForAnnotationTrack({
      description: 'Annotations',
      style: {
        ...(style as MarkerLaneStyle),
      },
    });

    annotations.forEach((annotation) => {
      if (annotation.markerType === 'moment') {
        const marker = this.createMomentMarker({
          id: annotation.id,
          timeObservation: {
            time: this.timecodeToTime(annotation.start)!,
          },
          style: {
            ...Constants.MOMENT_MARKER_STYLE,
            ...LayoutService.themeStyleConstants.MOMENT_MARKER_STYLE_COLORS,
            symbolType: 'circle',
            lineStrokeWidth: 2,
            lineOpacity: 0.2,
            color: this._annotationColor,
          },
          editable: true,
        });
        this.addMarkerClickHandler(marker);
        this._annotationLane!.addMarker(marker);
      } else if (annotation.markerType === 'period') {
        const marker = this.createPeriodMarker({
          id: annotation.id,
          timeObservation: {
            start: this.timecodeToTime(annotation.start!),
            end: annotation.end ? this.timecodeToTime(annotation.end) : undefined,
          },
          style: {
            ...Constants.PERIOD_MARKER_STYLE,
            ...LayoutService.themeStyleConstants.PERIOD_MARKER_STYLE_COLORS,
            symbolType: 'triangle',
            selectedAreaOpacity: 0.2,
            color: this._annotationColor,
          },
          editable: true,
        });
        this.addMarkerClickHandler(marker);
        this._annotationLane!.addMarker(marker);
      }
    });
  }

  createAnnotationTrack() {
    let color = this.resolveHeuristicColor();
    let style: Partial<MarkerLaneStyle> = {
      ...Constants.MARKER_LANE_STYLE,
      ...LayoutService.themeStyleConstants.MARKER_LANE_STYLE_COLORS,
      markerStyle: {
        color,
      },
    };

    this.createMarkerLaneForAnnotationTrack({
      description: 'Annotations',
      style: {
        ...(style as MarkerLaneStyle),
      },
    });
  }

  addPeriodMarker(timeObservation?: PeriodObservation, annotationData?: Partial<Annotation>): PeriodMarker {
    const marker = this.createPeriodMarker({
      timeObservation: {
        start: timeObservation?.start ?? 0,
        end: timeObservation?.end,
      },
      style: {
        ...Constants.PERIOD_MARKER_STYLE,
        ...LayoutService.themeStyleConstants.PERIOD_MARKER_STYLE_COLORS,
        symbolType: 'triangle',
        selectedAreaOpacity: 0.2,
        color: this._annotationColor,
      },
      editable: true,
    });
    this.addMarkerClickHandler(marker);
    this._annotationLane!.addMarker(marker);
    this.onMarkerSelected$.next(marker);
    const annotation = this.createAnnotationFromMarker(marker, annotationData);
    this.store.dispatch(new AddAnnotation(annotation));
    if (!timeObservation?.end) {
      this._incompleteMarker = marker;
    }
    return marker;
  }

  updatePeriodMarker(markerId: string, timeObservation?: Partial<PeriodObservation>) {
    if (this._incompleteMarker?.id === markerId) {
      delete this._incompleteMarker;
    }

    this.store.dispatch(
      new UpdateAnnotation(markerId, {
        start: this.timeToTimecode(timeObservation?.start),
        end: this.timeToTimecode(timeObservation?.end),
      })
    );
    this._annotationLane!.updateMarker(markerId, {timeObservation});
  }

  addMomentMarker(timeObservation?: MomentObservation, annotationData?: Partial<Annotation>): MomentMarker {
    const marker = this.createMomentMarker({
      timeObservation: {
        time: timeObservation?.time ?? 0,
      },
      style: {
        ...Constants.MOMENT_MARKER_STYLE,
        ...LayoutService.themeStyleConstants.MOMENT_MARKER_STYLE_COLORS,
        symbolType: 'circle',
        lineStrokeWidth: 2,
        lineOpacity: 0.2,
        color: this._annotationColor!,
      },
      editable: true,
    });
    this.addMarkerClickHandler(marker);
    this._annotationLane!.addMarker(marker);
    this.onMarkerSelected$.next(marker);
    const annotation = this.createAnnotationFromMarker(marker, annotationData);
    this.store.dispatch(new AddAnnotation(annotation));
    return marker;
  }

  updateMomentMarker(markerId: string, timeObservation?: Partial<MomentObservation>) {
    this.store.dispatch(
      new UpdateAnnotation(markerId, {
        start: this.timeToTimecode(timeObservation?.time),
      })
    );
    this.annotationLane!.updateMarker(markerId, {timeObservation: timeObservation});
  }

  addAnnotation(annotationData: Partial<Annotation>): Annotation {
    const annotation: Annotation = {
      id: CryptoUtil.uuid(),
      thread: annotationData.thread,
      body: annotationData.body ?? '',
      start: annotationData.start,
      end: annotationData.end,
      isPrivate: annotationData.isPrivate ?? false,
      user: annotationData.user ?? 'John Smith',
      createdAt: new Date(),
    };
    this.store.dispatch(new AddAnnotation(annotation));
    if (!annotationData.thread) {
      this.onAnnotationSelected$.next();
      this.store.dispatch(new SelectAnnotation(annotation.id));
      this.scrollAnnotationIntoView(annotation.id);
    }
    return annotation;
  }

  deleteMarker(markerId: string, skipAnimation = false) {
    if (this.annotationLane!.getMarker(markerId)) {
      this.annotationLane!.removeMarker(markerId);
    }
    if (skipAnimation) {
      this.store.dispatch(new DeleteAnnotation(markerId));
    } else {
      this.onMarkerRemove$.next(markerId);
      setTimeout(() => {
        this.store.dispatch(new DeleteAnnotation(markerId));
      }, 1000);
    }
  }

  selectAnnotation(annotationId: string) {
    const marker = this.annotationLane!.getMarker(annotationId);
    if (marker) {
      this.onMarkerSelected$.next(marker);
    } else {
      this.onAnnotationSelected$.next();
      if (this.store.selectSnapshot(AnnotationState.selectedAnnotation)?.id === annotationId) {
        this.store.dispatch(new SelectAnnotation(undefined));
      } else {
        this.store.dispatch(new SelectAnnotation(annotationId));
      }
    }
  }

  timeToTimecode(time: number | null | undefined) {
    return !isNullOrUndefined(time) ? this.ompApiService.api!.video.formatToTimecode(time!) : undefined;
  }

  timecodeToTime(timecode: string | undefined) {
    return !isNullOrUndefined(timecode) ? this.ompApiService.api!.video.parseTimecodeToTime(timecode!) : undefined;
  }

  private createPeriodMarker(markerConfig: ConfigWithOptionalStyle<PeriodMarkerConfig>): PeriodMarker {
    return new PeriodMarker(markerConfig);
  }

  private createMomentMarker(markerConfig: ConfigWithOptionalStyle<MomentMarkerConfig>): MomentMarker {
    return new MomentMarker(markerConfig);
  }

  private createMarkerLaneForAnnotationTrack(markerLaneConfig: Partial<MarkerLaneConfig>, index = 1) {
    this._annotationLane = new MarkerLane({
      ...markerLaneConfig,
    });
    this._annotationLane.onMarkerUpdate$.subscribe({
      next: (event) => {
        this.onMarkerUpdate$.next(event.marker);
        const annotationUpdate: Partial<Annotation> = {
          start: this.timeToTimecode((event.marker.timeObservation as PeriodObservation).start ?? (event.marker.timeObservation as MomentObservation).time),
          end: this.timeToTimecode((event.marker.timeObservation as PeriodObservation).end),
        };
        this.store.dispatch(new UpdateAnnotation(event.marker.id, annotationUpdate));
      },
    });
    this._annotationLane.onMarkerSelected$.subscribe({
      next: (event) => {
        this.store.dispatch(new SelectAnnotation(event.marker?.id));
        if (event.marker) {
          this.scrollAnnotationIntoView(event.marker.id);
        }
      },
    });
    this.timelineService.addTimelineLaneAtIndex(this._annotationLane, 1);
  }

  private scrollAnnotationIntoView(annotationId: string) {
    requestAnimationFrame(() => {
      document.getElementById(`annotation-${annotationId}`)?.scrollIntoView({block: 'nearest'});
    });
  }

  private createAnnotationFromMarker(marker: PeriodMarker | MomentMarker, annotationData?: Partial<Annotation>): Annotation {
    return {
      id: marker.id,
      body: annotationData?.body ?? '',
      start: this.timeToTimecode((marker as PeriodMarker).timeObservation.start ?? (marker as MomentMarker).timeObservation.time),
      end: this.timeToTimecode((marker as PeriodMarker).timeObservation.end),
      isPrivate: annotationData?.isPrivate ?? false,
      user: annotationData?.user ?? 'John Smith',
      createdAt: new Date(),
      markerType: 'start' in marker.timeObservation ? 'period' : 'moment',
    };
  }

  private resolveHeuristicColor(): string {
    const segmentationColors = LayoutService.themeStyleConstants.COLORS.SEGMENTATION_COLORS;
    this._annotationColor = segmentationColors[0];
    return this._annotationColor;
  }

  private addMarkerClickHandler(marker: Marker) {
    marker.onClick$.subscribe(() => {
      this.onMarkerSelected$.next(marker);
    });
  }
}
