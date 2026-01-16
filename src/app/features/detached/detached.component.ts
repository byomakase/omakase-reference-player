import {Component} from '@angular/core';
import {OmakasePlayerVideoDetachedComponent} from '../../shared/components/omakase-player/omakase-player-video-detached/omakase-player-video-detached.component';
import {Constants} from '../../shared/constants/constants';
import {LocalStorageService} from '../../shared/storage/local-storage.service';

@Component({
    selector: 'app-detached',
    imports: [OmakasePlayerVideoDetachedComponent],
    templateUrl: './detached.component.html'
})
export class DetachedComponent {
  OmakasePlayerConstants = Constants;

  constructor() {
    const presentationMode = LocalStorageService.getItem('presentationMode');
    document.body.setAttribute('class', `theme-${presentationMode}`);
    window.addEventListener('storage', this.handlePresentationModeChange);
  }

  ngOnDestroy() {
    window.removeEventListener('storage', this.handlePresentationModeChange);
  }

  private handlePresentationModeChange(event: StorageEvent) {
    if (event.storageArea === localStorage && event.key === 'presentationMode') {
      document.body.setAttribute('class', `theme-${event.newValue}`);
    }
  }
}
