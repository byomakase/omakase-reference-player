import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-edit-modal',
  standalone: true,
  imports: [],
  template: `
    <div class="custom-modal">
      <div class="modal-header">
        <span>EDIT MARKER</span>
        <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <div class="d-flex input-body">
          <label>Marker Name</label>
          <input type="text" [value]="markerName ? markerName : ''" #name />
        </div>
      </div>
      <div class="modal-footer">
        <div class="d-flex btn-group">
          <button type="button" class="btn action-button" (click)="onUpdateAction()">Update</button>
          <button type="button" class="btn close-button" (click)="activeModal.dismiss()">Cancel</button>
        </div>
      </div>
    </div>
  `,
})
export class EditModalComponent {
  @ViewChild('name') newMarkerName!: ElementRef;

  @Input()
  markerName: string | undefined;

  @Output()
  onUpdate: EventEmitter<string> = new EventEmitter<string>();

  constructor(public activeModal: NgbActiveModal) {}

  onUpdateAction() {
    this.onUpdate.emit(this.newMarkerName.nativeElement.value);
    this.activeModal.dismiss();
  }
}
