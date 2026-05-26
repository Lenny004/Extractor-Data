import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-sheet-tabs',
  templateUrl: './sheet-tabs.html',
  styleUrl: './sheet-tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTabsComponent {
  readonly sheets = input.required<string[]>();
  readonly activeSheet = input.required<string>();
  readonly sheetChange = output<string>();

  cambiarHoja(name: string): void {
    this.sheetChange.emit(name);
  }
}
