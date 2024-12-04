import {ElementRef, Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {SessionData} from '../../../model/domain.model';

interface ScrollPosition {
  top: number;
  left: number;
}

@Injectable({
  providedIn: 'root',
})
export class MetadataExplorerService {
  private navActiveId: string | undefined;
  private navIdScrollPositionMap: Record<string, ScrollPosition> = {};

  private _metadataContentElementRef: ElementRef | undefined;

  onNavChange(activeId: string) {
    this.navActiveId = activeId;
    // scroll to previously saved position
    if (this._metadataContentElementRef) {
      if (this.navIdScrollPositionMap[this.navActiveId]) {
        let scrollPosition = this.navIdScrollPositionMap[this.navActiveId];
        this._metadataContentElementRef.nativeElement.scrollTop = scrollPosition.top;
        this._metadataContentElementRef.nativeElement.scrollLeft = scrollPosition.left;
      } else {
        this._metadataContentElementRef.nativeElement.scrollLeft = 0;
        this._metadataContentElementRef.nativeElement.scrollTop = 0;
      }
    }
  }

  onMetadataContentScroll(event: any) {
    if (this.navActiveId && this._metadataContentElementRef) {
      // save scroll position
      this.navIdScrollPositionMap[this.navActiveId] = {
        top: this._metadataContentElementRef.nativeElement.scrollTop,
        left: this._metadataContentElementRef.nativeElement.scrollLeft,
      };
    }
  }

  set metadataContentElementRef(value: ElementRef) {
    this._metadataContentElementRef = value;
  }
}