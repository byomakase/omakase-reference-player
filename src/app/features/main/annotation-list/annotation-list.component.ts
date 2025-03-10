import {ChangeDetectorRef, Component, ElementRef, HostBinding, HostListener, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {Store} from '@ngxs/store';
import {Annotation, AnnotationState} from '../annotation/annotation.state';
import {filter, interval, map, Observable, Subject, takeUntil} from 'rxjs';
import {AnnotationService} from '../annotation/annotation.service';
import {InlineEditComponent} from '../../../shared/components/inline-edit/inline-edit.component';
import {AnnotationActions} from '../annotation/annotation.actions';
import UpdateAnnotation = AnnotationActions.UpdateAnnotation;
import {AnnotationSortingStrategy, timecodeSortingStrategy} from './annotation-list.sorting';
import {AnnotationListFilterPipe} from './annotation-list-filter.pipe';
import {AnnotationListSortPipe} from './annotation-list-sort.pipe';

export type ExtendedAnnotation = Annotation & {
  timeDisplay: string;
  isSelected: boolean;
  edit$: Observable<void>;
  removing: boolean;
  collapsed: boolean;
  children: Array<Annotation & {timeDisplay: string; edit$: Observable<void>}>;
};

@Component({
  selector: 'div[appAnnotationList]',
  standalone: true,
  imports: [CoreModule, SharedModule, InlineEditComponent, AnnotationListFilterPipe, AnnotationListSortPipe],
  template: `@for (annotation of annotationList | annotationListFilter: filterToken : filterTokenSetDate : selectedId | annotationListSort: sortingStrategy; track annotation.id) {
    <div
      class="annotation-item d-flex flex-column"
      id="annotation-{{ annotation.id }}"
      [class.active]="annotation.isSelected"
      [class.fade-out]="annotation.removing"
      [class.collapsed]="annotation.collapsed"
      (click)="selectAnnotation(annotation)"
    >
      @if (annotation.start) {
        <div class="annotation-item-start">{{ annotation.start }}</div>
      }
      <div class="annotation-item-collapse-toggle">
        <i [appIcon]="annotation.collapsed ? 'chevron-down' : 'chevron-up'" (click)="toggleAnnotationCollapse($event, annotation)"></i>
      </div>
      <div class="d-flex">
        <div class="annotation-item-user-icon">
          <i appIcon="user" [style.color]="'#62C0A4'"></i>
          @if (annotation.children.length) {
            <div class="annotation-item-connect-line"></div>
          }
        </div>
        <div class="annotation-item-body flex-grow-1">
          <div class="annotation-item-top">
            <span class="annotation-item-user">{{ annotation.user }}</span>
            <span class="annotation-item-created">{{ annotation.timeDisplay }}</span>
          </div>
          <div class="annotation-item-details">
            <app-inline-edit [displayText]="annotation.body" [edit$]="annotation.edit$" (edited)="saveAnnotationBody(annotation, $event)"></app-inline-edit>
            <div class="annotation-item-actions">
              <i appIcon="edit" (click)="editAnnotation($event, annotation)"></i>
              <i appIcon="delete" (click)="deleteAnnotation($event, annotation)"></i>
              @if (isThreadingSupported && !annotation.children.length && filterToken === '') {
                <span (click)="replyToAnnotation($event, annotation)">Reply</span>
              }
            </div>
          </div>
        </div>
      </div>
      @for (child of annotation.children; track child.id) {
        <div class="d-flex">
          <div class="annotation-item-user-icon">
            <i appIcon="user" [style.color]="'#62C0A4'"></i>
            @if ($index < annotation.children.length - 1) {
              <div class="annotation-item-connect-line"></div>
            }
          </div>
          <div class="annotation-item-body flex-grow-1">
            <div class="annotation-item-top">
              <span class="annotation-item-user">{{ child.user }}</span>
              <span class="annotation-item-created">{{ child.timeDisplay }}</span>
            </div>
            <div class="annotation-item-details">
              <app-inline-edit [displayText]="child.body" [edit$]="child.edit$" (edited)="saveAnnotationBody(child, $event)"></app-inline-edit>
              <div class="annotation-item-actions">
                <i appIcon="edit" (click)="editAnnotation($event, child)"></i>
                <i appIcon="delete" (click)="deleteAnnotation($event, child, true)"></i>
                @if (isThreadingSupported && $index === annotation.children.length - 1 && filterToken === '') {
                  <span (click)="replyToAnnotation($event, annotation)">Reply</span>
                }
              </div>
            </div>
          </div>
        </div>
      }
      @if (annotation === (reply$ | async)) {
        <div class="annotation-item-reply" (click)="$event.stopImmediatePropagation()">
          <input #replyInput class="w-100" placeholder="Add a reply..." (keydown)="handleReplyKeydown($event, annotation)" />
          <i appIcon="send" [class.active]="replyInput.value" (click)="saveReply(annotation)"></i>
        </div>
      }
    </div>
  }`,
})
export class AnnotationListComponent implements OnInit, OnDestroy {
  @Input() isThreadingSupported = false;

  @ViewChild('replyInput', {static: false}) replyInput?: ElementRef;

  public edit$ = new Subject<Annotation>();
  public reply$ = new Subject<Annotation | null>();
  public selectedId?: string;

  private _destroyed$ = new Subject<void>();
  private _annotationList: ExtendedAnnotation[] = [];
  private _timeDisplayRefreshInterval = 300000;
  private _sortingStrategy?: AnnotationSortingStrategy;
  private _selectedAfterFiltering?: string;
  private _filterToken: string = '';
  private _filterTokenUpdatedAt?: Date;

  constructor(
    private store: Store,
    private annotationService: AnnotationService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'annotation-list-content';
  }

  get annotationList() {
    return this._annotationList;
  }

  set sortingStrategy(sortingStrategy: AnnotationSortingStrategy | undefined) {
    this._sortingStrategy = sortingStrategy;
    this.changeDetectorRef.detectChanges();
  }

  get sortingStrategy() {
    return this._sortingStrategy;
  }

  set filterToken(filterToken: string) {
    if (filterToken == '' && this._selectedAfterFiltering) {
      this.annotationService.selectAnnotation(this._selectedAfterFiltering);
      this._selectedAfterFiltering = undefined;
      this._filterTokenUpdatedAt = undefined;
    } else {
      this._filterTokenUpdatedAt = new Date();
    }
    this._filterToken = filterToken;
  }

  get filterToken() {
    return this._filterToken;
  }

  get filterTokenSetDate() {
    return this._filterTokenUpdatedAt;
  }

  public sort() {
    this._annotationList.sort(this._sortingStrategy);
    this.changeDetectorRef.detectChanges();
  }

  public changeCollapsedState(collapsed: boolean) {
    if (collapsed) {
      this.annotationList.forEach((annotation) => (annotation.collapsed = true));
      this._annotationList = [...this.annotationList];
    } else {
      this.annotationList.forEach((annotation) => (annotation.collapsed = false));
      this._annotationList = [...this.annotationList];
    }
  }

  ngOnInit(): void {
    this.store
      .select(AnnotationState.annotations)
      .pipe(takeUntil(this._destroyed$))
      .subscribe((annotations) => {
        const selectedId = this.store.selectSnapshot(AnnotationState.selectedAnnotation)?.id;

        this._annotationList = annotations.map((annotation) => {
          const isSelected = selectedId === annotation.id;
          if (this.filterToken != '' && selectedId && annotation.children) {
            const selectedChild = annotation.children.find((child) => child.id === selectedId);
            if (selectedChild) {
              this._selectedAfterFiltering = annotation.id;
            }
          }
          return {
            ...annotation,
            timeDisplay: this.formatCreatedAt(annotation.createdAt),
            isSelected: isSelected,
            edit$: this.getAnnotationEditObservable(annotation),
            removing: false,
            collapsed: this.annotationList.find((a) => a.id === annotation.id)?.collapsed ?? false,
            children: annotation.children.map((child) => ({
              ...child,
              timeDisplay: this.formatCreatedAt(child.createdAt),
              edit$: this.getAnnotationEditObservable(child),
            })),
          };
        });
      });
    this.store
      .select(AnnotationState.selectedAnnotation)
      .pipe(takeUntil(this._destroyed$))
      .subscribe((annotation) => {
        const currentSelected = this._annotationList.find((a) => a.isSelected);
        if (currentSelected) {
          currentSelected.isSelected = false;
        }
        if (annotation) {
          const newSelected = this.annotationList.find((a) => a.id === annotation.id);
          if (newSelected) {
            newSelected.isSelected = true;
          }
        }
      });
    interval(this._timeDisplayRefreshInterval)
      .pipe(takeUntil(this._destroyed$))
      .subscribe(() => {
        this._annotationList.forEach((annotation) => {
          annotation.timeDisplay = this.formatCreatedAt(annotation.createdAt);
        });
      });
    this.annotationService.onMarkerRemove$.pipe(takeUntil(this._destroyed$)).subscribe((markerId) => {
      const annotation = this.annotationList.find((a) => a.id === markerId);
      if (annotation) {
        annotation.removing = true;
      }
    });

    this.store.select(AnnotationState.selectedAnnotation).subscribe({
      next: (annotation) => (this.selectedId = annotation?.id),
    });
  }

  ngOnDestroy(): void {
    this._destroyed$.next();
  }

  @HostListener('document:click')
  public replyClickHandler(): void {
    this.reply$.next(null);
  }

  editAnnotation(event: MouseEvent, annotation: Annotation) {
    event.stopPropagation();
    this.edit$.next(annotation);
  }

  replyToAnnotation(event: MouseEvent, annotation: Annotation) {
    event.stopPropagation();
    this.reply$.next(annotation);
    requestAnimationFrame(() => {
      this.replyInput!.nativeElement.focus();
    });
  }

  saveReply(annotation: Annotation) {
    const body = this.replyInput!.nativeElement.value;
    if (body) {
      this.annotationService.addAnnotation({body, thread: annotation.thread ?? annotation.id, start: annotation.start, end: annotation.end, isPrivate: annotation.isPrivate});
    }
  }

  handleReplyKeydown(event: KeyboardEvent, annotation: Annotation) {
    if (event.code === 'Enter') {
      this.saveReply(annotation);
    } else if (event.code === 'Escape') {
      this.reply$.next(null);
    }
  }

  deleteAnnotation(event: MouseEvent, annotation: Annotation | ExtendedAnnotation, skipAnimation = false) {
    event.stopPropagation();
    this.annotationService.deleteMarker(annotation.id, skipAnimation);
  }

  selectAnnotation(annotation: ExtendedAnnotation) {
    this.annotationService.selectAnnotation(annotation.id);
  }

  saveAnnotationBody(annotation: Annotation, body: string) {
    this.store.dispatch(new UpdateAnnotation(annotation.id, {body}));
  }

  toggleAnnotationCollapse(event: MouseEvent, annotation: ExtendedAnnotation) {
    event.stopPropagation();
    annotation.collapsed = !annotation.collapsed;
  }

  private getAnnotationEditObservable(annotation: Annotation): Observable<void> {
    return this.edit$.pipe(
      filter((a) => a.id === annotation.id),
      map((a) => void 0)
    );
  }

  private formatCreatedAt(createdAt: Date): string {
    const now = new Date();
    if (now.getTime() - createdAt.getTime() < 300000) {
      // < 5 minutes
      return 'Just now';
    } else if (now.getTime() - createdAt.getTime() < 3600000) {
      // < 60 minutes
      return new Date(now.getTime() - createdAt.getTime()).getUTCMinutes() + 'min ago';
    } else if (now.getTime() - createdAt.getTime() < 21600000) {
      // < 6 hours
      return new Date(now.getTime() - createdAt.getTime()).getUTCHours() + 'hrs ago';
    } else if (now.getTime() - createdAt.getTime() < 86400000) {
      // < 24 hours
      return createdAt.toTimeString().slice(0, 5);
    } else {
      // > 24 hours
      return createdAt.toDateString().slice(4, 10);
    }
  }
}
