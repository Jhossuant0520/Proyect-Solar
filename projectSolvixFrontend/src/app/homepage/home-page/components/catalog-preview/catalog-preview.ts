import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-catalog-preview',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './catalog-preview.html',
  styleUrl: './catalog-preview.scss'
})
export class CatalogPreview {}
