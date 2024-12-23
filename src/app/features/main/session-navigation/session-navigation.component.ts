import {Component, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {IconModule} from '../../../shared/components/icon/icon.module';
import {SessionData} from '../../../model/domain.model';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';

@Component({
  selector: 'div[appSessionNavigation]',
  standalone: true,
  imports: [CoreModule, SharedModule, IconModule],
  template: `
    <div id="session-navigation">
      <div class="btn-group" role="group" [class.d-none]="!(showButtons$ | async)">
        <button type="button" class="btn" [disabled]="isPrevDisabled" (click)="onPreviousSessionClick()">
          <i appIcon="arrow-left"></i>
        </button>
        <button type="button" class="btn" [disabled]="isNextDisabled" (click)="onNextSessionClick()">
          <i appIcon="arrow-right"></i>
        </button>
      </div>
    </div>
  `,
})
export class SessionNavigationComponent {
  showButtons$ = new BehaviorSubject<boolean>(false);

  private _sessionData?: SessionData;

  private _isPrevDisabled: boolean = true;
  private _isNextDisabled: boolean = true;

  @Input()
  set sessionData(value: SessionData | undefined) {
    this._sessionData = value;
  }

  @Input()
  set disableSessionButtons(value: BehaviorSubject<boolean>) {
    value.subscribe({
      next: (v) => {
        if (this._sessionData?.session?.previous || this._sessionData?.session?.next) {
          this.showButtons$.next(true);

          if (v) {
            this._isPrevDisabled = v;
            this._isNextDisabled = v;
          } else {
            this._isPrevDisabled = !this._sessionData.session.previous;
            this._isNextDisabled = !this._sessionData.session.next;
          }
        } else {
          this.showButtons$.next(false);
        }
      },
    });
  }

  @Output()
  readonly onPreviousSession: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  readonly onNextSession: EventEmitter<string> = new EventEmitter<string>();

  onPreviousSessionClick() {
    if (!this._sessionData || !this._sessionData.session) {
      return;
    }

    this.onPreviousSession.emit(this._sessionData.session.previous);
  }

  onNextSessionClick() {
    if (!this._sessionData || !this._sessionData.session) {
      return;
    }

    this.onNextSession.emit(this._sessionData.session.next);
  }

  get isPrevDisabled(): boolean {
    return this._isPrevDisabled;
  }

  get isNextDisabled(): boolean {
    return this._isNextDisabled;
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    // Navigate to Previous Session | Navigate to Next Session
    if (['ArrowLeft', 'ArrowRight'].includes(event.key) && event.altKey) {
      event.preventDefault();
      let previousOrNext = event.key === 'ArrowRight' ? 1 : 0;
      if (previousOrNext) {
        if (this.isNextDisabled) {
          return;
        }
        this.onNextSessionClick();
      } else {
        if (this.isPrevDisabled) {
          return;
        }
        this.onPreviousSessionClick();
      }
    }
  }
}
