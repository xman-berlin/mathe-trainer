import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import type { User } from '../../models/user.model';
import { AvatarService } from '../../services/avatar.service';
import { MigrationService } from '../../services/migration.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  const mockAuthService = {
    currentUser: signal(null),
    isAuthenticated: signal(false),
    getAllUsers: jasmine.createSpy('getAllUsers').and.returnValue(Promise.resolve([])),
    login: jasmine.createSpy('login').and.returnValue(Promise.resolve()),
    createUser: jasmine.createSpy('createUser').and.returnValue(Promise.resolve({ id: '1', username: 'test', avatar_style: 'adventurer' })),
  };

  const mockAvatarService = {
    getAvailableStyles: () => ['adventurer', 'bottts', 'fun-emoji'],
    generateAvatarUrl: (username: string, style: string) => `https://avatar.com/${username}?style=${style}`,
    getStyleLabel: (style: string) => style,
  };

  const mockMigrationService = {
    hasMigratedData: signal(false),
    hasOldDataAvailable: signal(false),
    migrateLocalDataToUser: jasmine.createSpy('migrateLocalDataToUser').and.returnValue(Promise.resolve()),
    clearOldData: jasmine.createSpy('clearOldData'),
    skipMigration: jasmine.createSpy('skipMigration'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: AvatarService, useValue: mockAvatarService },
        { provide: MigrationService, useValue: mockMigrationService },
      ],
    });

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty search term', () => {
    expect(component.searchTerm()).toBe('');
  });

  it('should have default avatar style adventurer', () => {
    expect(component.selectedStyle()).toBe('adventurer');
  });

  it('should compute preview avatar URL', () => {
    const url = component.previewAvatarUrl();
    expect(url).toContain('preview');
    expect(url).toContain('adventurer');
  });

  it('should open create modal', () => {
    component.openCreateModal();
    expect(component.showCreateModal()).toBeTrue();
    expect(component.newUsername()).toBe('');
    expect(component.selectedStyle()).toBe('adventurer');
  });

  it('should close create modal', () => {
    component.showCreateModal.set(true);
    component.closeCreateModal();
    expect(component.showCreateModal()).toBeFalse();
  });

  it('should select avatar style', () => {
    component.selectAvatarStyle('bottts');
    expect(component.selectedStyle()).toBe('bottts');
  });

  it('should validate username correctly', () => {
    component.newUsername.set('ab');
    fixture.detectChanges();
    expect(component.isValidUsername()).toBeTrue();

    component.newUsername.set('a');
    fixture.detectChanges();
    expect(component.isValidUsername()).toBeFalse();

    component.newUsername.set('valid_name-1');
    fixture.detectChanges();
    expect(component.isValidUsername()).toBeTrue();

    component.newUsername.set('invalid name');
    fixture.detectChanges();
    expect(component.isValidUsername()).toBeFalse();
  });

  it('should get avatar URL for user', () => {
    const url = component.getAvatarUrl({ username: 'testuser', avatar_style: 'adventurer' } as User);
    expect(url).toContain('testuser');
  });

  it('should format last active date', () => {
    const today = new Date().toISOString();
    expect(component.formatLastActive(today)).toBe('Heute');

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(component.formatLastActive(yesterday)).toBe('Gestern');
  });

  it('should migrate and open create modal', () => {
    component.showMigrationDialog.set(true);
    component.migrateAndCreateUser();
    expect(component.showMigrationDialog()).toBeFalse();
    expect(component.showCreateModal()).toBeTrue();
  });

  it('should skip migration and open create modal', () => {
    component.showMigrationDialog.set(true);
    component.startFresh();
    expect(mockMigrationService.skipMigration).toHaveBeenCalled();
    expect(component.showMigrationDialog()).toBeFalse();
    expect(component.showCreateModal()).toBeTrue();
  });
});
