import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VocabManagementComponent } from './vocab-management';
import { DeutschService } from '../../services/vocab.service';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import type { VocabList, VocabWord } from '../../models/vocab.model';

describe('VocabManagementComponent', () => {
  let component: VocabManagementComponent;
  let fixture: ComponentFixture<VocabManagementComponent>;

  const mockDeutschService = {
    loadUserData: jasmine.createSpy('loadUserData').and.returnValue(Promise.resolve()),
  };

  const mockSupabaseService = {
    getVocabLists: jasmine.createSpy('getVocabLists').and.returnValue(Promise.resolve([])),
    getAllUsers: jasmine.createSpy('getAllUsers').and.returnValue(Promise.resolve([])),
    getVocabListWords: jasmine.createSpy('getVocabListWords').and.returnValue(Promise.resolve([])),
    getVocabAssignmentsForUser: jasmine.createSpy('getVocabAssignmentsForUser').and.returnValue(Promise.resolve([])),
    createVocabList: jasmine.createSpy('createVocabList').and.returnValue(Promise.resolve()),
    updateVocabList: jasmine.createSpy('updateVocabList').and.returnValue(Promise.resolve()),
    deleteVocabList: jasmine.createSpy('deleteVocabList').and.returnValue(Promise.resolve()),
    addVocabWord: jasmine.createSpy('addVocabWord').and.returnValue(Promise.resolve()),
    updateVocabWord: jasmine.createSpy('updateVocabWord').and.returnValue(Promise.resolve()),
    deleteVocabWord: jasmine.createSpy('deleteVocabWord').and.returnValue(Promise.resolve()),
    assignListToUser: jasmine.createSpy('assignListToUser').and.returnValue(Promise.resolve()),
    unassignListFromUser: jasmine.createSpy('unassignListFromUser').and.returnValue(Promise.resolve()),
  };

  const mockAuthService = {
    currentUser: signal(null),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DeutschService, useValue: mockDeutschService },
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    fixture = TestBed.createComponent(VocabManagementComponent);
    component = fixture.componentInstance;
  });

  it('should create', async () => {
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  it('should compute selected list', async () => {
    component.lists.set([
      { id: '1', name: 'Test List' } as VocabList,
    ]);
    component.selectedListId.set('1');
    expect(component.selectedList()?.name).toBe('Test List');

    component.selectedListId.set('2');
    expect(component.selectedList()).toBeNull();
  });

  it('should check assignment', () => {
    component.assignedUserIds.set(new Set(['user1']));
    expect(component.isAssigned('user1')).toBeTrue();
    expect(component.isAssigned('user2')).toBeFalse();
  });

  it('should start and cancel rename', () => {
    const list = { id: '1', name: 'Test' } as VocabList;
    component.startRenameList(list);
    expect(component.renamingListId()).toBe('1');
    expect(component.renameListValue()).toBe('Test');

    component.cancelRenameList();
    expect(component.renamingListId()).toBeNull();
  });

  it('should start and cancel word edit', () => {
    const word = { id: 'w1', list_id: '1', word: 'Hallo' } as VocabWord;
    component.startEditWord(word);
    expect(component.editingWordId()).toBe('w1');
    expect(component.editingWordValue()).toBe('Hallo');

    component.cancelEditWord();
    expect(component.editingWordId()).toBeNull();
  });
});
