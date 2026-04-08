import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss'] 
})
export class Contact {

 onSubmit() {
    alert('Mensaje enviado correctamente 🚀');
  }

}