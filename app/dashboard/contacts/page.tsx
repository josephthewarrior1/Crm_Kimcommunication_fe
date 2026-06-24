'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Contact, Company, ContactEmail, Group } from '../../../lib/types';
import { Users, Search, Plus, X, Loader2, Mail, Phone, ExternalLink, ShieldAlert, Trash2, Edit2, Eye, Building2, FolderTree, Globe, MapPin, CheckCircle, AlertCircle, RefreshCw, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';

const checkContactCompleteness = (c: Contact) => {
  const missing: string[] = [];
  
  if (!c.company?.group?.name?.trim()) missing.push("Nama Group Holding");
  if (!c.company?.brandName?.trim()) missing.push("Nama Brand");
  if (!c.company?.name?.trim()) missing.push("Company Name");
  if (!c.salutation?.trim()) missing.push("Salutation");
  if (!c.firstName?.trim()) missing.push("First Name");
  if (!c.lastName?.trim()) missing.push("Last Name");
  if (!c.positionLevel || c.positionLevel === 'unknown' || !c.positionLevel.trim()) missing.push("Position");
  if (!c.jobTitle?.trim()) missing.push("Job Title");
  if (!c.company?.address?.trim()) missing.push("Address");
  if (!c.company?.officePhone?.trim()) missing.push("Office Phone");
  if (!c.mobilePhone?.trim()) missing.push("Mobile Phone");
  
  const emails = c.emails || [];
  const hasCompanyEmail = emails.some(e => e.isCorporate || e.emailType === 'company');
  const hasPersonalEmail = emails.some(e => !e.isCorporate && e.emailType === 'personal');
  
  if (!hasCompanyEmail) missing.push("Company Email");
  if (!hasPersonalEmail) missing.push("Personal Email");
  
  if (!c.company?.industry?.trim()) missing.push("Industry");
  if (!c.linkedinUrl?.trim()) missing.push("LinkedIn Link");
  if (!c.company?.city?.trim()) missing.push("City");
  if (!c.company?.website?.trim()) missing.push("Company Website");

  return {
    isIncomplete: missing.length > 0,
    missingFields: missing
  };
};

const checkFormCompleteness = (
  salutationVal: string,
  firstNameVal: string,
  lastNameVal: string,
  positionVal: string,
  jobTitleVal: string,
  mobilePhoneVal: string,
  companyEmailVal: string,
  personalEmailVal: string,
  linkedinUrlVal: string,
  compSelectedId: string,
  companiesList: Company[]
) => {
  const missing: string[] = [];
  const selectedComp = companiesList.find(comp => comp.id === compSelectedId);

  if (!selectedComp?.group?.name?.trim()) missing.push("Nama Group Holding");
  if (!selectedComp?.brandName?.trim()) missing.push("Nama Brand");
  if (!selectedComp?.name?.trim()) missing.push("Company Name");
  if (!salutationVal?.trim()) missing.push("Salutation");
  if (!firstNameVal?.trim()) missing.push("First Name");
  if (!lastNameVal?.trim()) missing.push("Last Name");
  if (!positionVal || positionVal === 'unknown' || !positionVal.trim()) missing.push("Position");
  if (!jobTitleVal?.trim()) missing.push("Job Title");
  if (!selectedComp?.address?.trim()) missing.push("Address");
  if (!selectedComp?.officePhone?.trim()) missing.push("Office Phone");
  if (!mobilePhoneVal?.trim()) missing.push("Mobile Phone");
  if (!companyEmailVal?.trim()) missing.push("Company Email");
  if (!personalEmailVal?.trim()) missing.push("Personal Email");
  if (!selectedComp?.industry?.trim()) missing.push("Industry");
  if (!linkedinUrlVal?.trim()) missing.push("LinkedIn Link");
  if (!selectedComp?.city?.trim()) missing.push("City");
  if (!selectedComp?.website?.trim()) missing.push("Company Website");

  return {
    isIncomplete: missing.length > 0,
    missingFields: missing
  };
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Filter states
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [filterPositionLevel, setFilterPositionLevel] = useState('');
  const [filterJobTitle, setFilterJobTitle] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isTakeoutModalOpen, setIsTakeoutModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);

  // Focus contact state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactEmails, setContactEmails] = useState<ContactEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Focus detail state
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [detailEmails, setDetailEmails] = useState<ContactEmail[]>([]);
  const [loadingDetailEmails, setLoadingDetailEmails] = useState(false);

  // Form inputs for Contact creation
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [salutation, setSalutation] = useState('Mr');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [positionLevel, setPositionLevel] = useState('unknown');
  const [specialityDivision, setSpecialityDivision] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [contactType, setContactType] = useState('unknown');
  const [source, setSource] = useState('manual');
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactCompanyEmail, setContactCompanyEmail] = useState('');
  const [contactPersonalEmail, setContactPersonalEmail] = useState('');

  // Form inputs for Contact editing
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editSalutation, setEditSalutation] = useState('Mr');
  const [editSelectedCompanyId, setEditSelectedCompanyId] = useState('');
  const [editPositionLevel, setEditPositionLevel] = useState('unknown');
  const [editSpecialityDivision, setEditSpecialityDivision] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editMobilePhone, setEditMobilePhone] = useState('');
  const [editLinkedinUrl, setEditLinkedinUrl] = useState('');
  const [editContactType, setEditContactType] = useState('unknown');
  const [editSource, setEditSource] = useState('manual');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editContactCompanyEmail, setEditContactCompanyEmail] = useState('');
  const [editContactCompanyEmailId, setEditContactCompanyEmailId] = useState('');
  const [editContactPersonalEmail, setEditContactPersonalEmail] = useState('');
  const [editContactPersonalEmailId, setEditContactPersonalEmailId] = useState('');

  // Form inputs for Email addition
  const [newEmailStr, setNewEmailStr] = useState('');
  const [emailType, setEmailType] = useState('company');
  const [isPrimary, setIsPrimary] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);

  // Form inputs for Takeout/Removal Request
  const [removalReason, setRemovalReason] = useState('lainnya');
  const [requestedBy, setRequestedBy] = useState('');
  const [sourceDb, setSourceDb] = useState('');
  const [takeoutNotes, setTakeoutNotes] = useState('');
  const [submittingTakeout, setSubmittingTakeout] = useState(false);

  // Delete contact target state
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [editSubmitAttempted, setEditSubmitAttempted] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [conList, compList, groupList] = await Promise.all([
        crmService.getContacts(),
        crmService.getCompanies(),
        crmService.getGroups()
      ]);
      setContacts(conList);
      setCompanies(compList);
      setGroups(groupList);
    } catch (err) {
      toast.error('Failed to load contacts, companies or groups');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // Check all required fields on submit
    const missing: string[] = [];
    if (!firstName.trim()) missing.push("First Name");
    if (!lastName.trim()) missing.push("Last Name");
    if (!salutation.trim()) missing.push("Salutation");
    if (!jobTitle.trim()) missing.push("Job Title");
    if (!positionLevel || positionLevel === 'unknown' || !positionLevel.trim()) missing.push("Position Level");
    if (!mobilePhone.trim()) missing.push("Mobile Phone");
    if (!contactCompanyEmail.trim()) missing.push("Company Email");
    if (!contactPersonalEmail.trim()) missing.push("Personal Email");
    if (!linkedinUrl.trim()) missing.push("LinkedIn Profile URL");
    if (!selectedCompanyId) missing.push("Associated Company");

    if (missing.length > 0) {
      toast.error(`Harap isi semua kolom wajib: ${missing.join(", ")}`);
      return;
    }

    setSubmittingContact(true);
    try {
      const createdContact = await crmService.createContact(
        {
          salutation,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          positionLevel: positionLevel || 'unknown',
          specialityDivision: specialityDivision.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          mobilePhone: mobilePhone.trim() || undefined,
          normalizedPhone: mobilePhone.trim() ? `+62${mobilePhone.trim().replace(/^0/, '')}` : undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          contactType,
          source,
          isActive: true
        },
        selectedCompanyId || undefined
      );

      // Save Company Email if filled
      if (contactCompanyEmail.trim()) {
        try {
          await crmService.addContactEmail(createdContact.id, {
            email: contactCompanyEmail.trim().toLowerCase(),
            emailType: 'company',
            isPrimary: true,
            isVerified: true,
            isCorporate: true
          });
        } catch (emailErr: any) {
          toast.warning(`Contact created, but failed to save company email: ${emailErr.message}`);
        }
      }

      // Save Personal Email if filled
      if (contactPersonalEmail.trim()) {
        try {
          await crmService.addContactEmail(createdContact.id, {
            email: contactPersonalEmail.trim().toLowerCase(),
            emailType: 'personal',
            isPrimary: !contactCompanyEmail.trim(), // Primary if company email is empty
            isVerified: true,
            isCorporate: false
          });
        } catch (emailErr: any) {
          toast.warning(`Contact created, but failed to save personal email: ${emailErr.message}`);
        }
      }

      toast.success('Contact created successfully!');
      setIsCreateModalOpen(false);
      setSubmitAttempted(false);
      
      // Reset form
      setFirstName('');
      setLastName('');
      setContactCompanyEmail('');
      setContactPersonalEmail('');
      setSelectedCompanyId('');
      setPositionLevel('unknown');
      setSpecialityDivision('');
      setJobTitle('');
      setMobilePhone('');
      setLinkedinUrl('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create contact');
    } finally {
      setSubmittingContact(false);
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImportFile) {
      toast.error('Please select an Excel file first');
      return;
    }

    setImportingExcel(true);
    try {
      const res = await crmService.importContactsExcel(selectedImportFile);
      toast.success(res.message || `Successfully imported ${res.count} contact(s)!`);
      setIsImportModalOpen(false);
      setSelectedImportFile(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to import Excel data');
    } finally {
      setImportingExcel(false);
    }
  };

  const openEditModal = async (contact: Contact) => {
    setEditingContact(contact);
    setEditFirstName(contact.firstName);
    setEditLastName(contact.lastName);
    setEditSalutation(contact.salutation || 'Mr');
    setEditSelectedCompanyId(contact.company?.id || '');
    setEditPositionLevel(contact.positionLevel || 'unknown');
    setEditSpecialityDivision(contact.specialityDivision || '');
    setEditJobTitle(contact.jobTitle || '');
    setEditMobilePhone(contact.mobilePhone || '');
    setEditLinkedinUrl(contact.linkedinUrl || '');
    setEditContactType(contact.contactType || 'unknown');
    setEditSource(contact.source || 'manual');
    setEditIsActive(contact.isActive !== false);
    setEditSubmitAttempted(false);

    // Fetch emails
    setEditContactCompanyEmail('');
    setEditContactCompanyEmailId('');
    setEditContactPersonalEmail('');
    setEditContactPersonalEmailId('');
    try {
      const emails = await crmService.getContactEmails(contact.id);
      if (emails && emails.length > 0) {
        const compEmail = emails.find(e => e.isCorporate || e.emailType === 'company');
        if (compEmail) {
          setEditContactCompanyEmail(compEmail.email);
          setEditContactCompanyEmailId(compEmail.id);
        }
        const persEmail = emails.find(e => !e.isCorporate && e.emailType === 'personal');
        if (persEmail) {
          setEditContactPersonalEmail(persEmail.email);
          setEditContactPersonalEmailId(persEmail.id);
        }
      }
    } catch (err) {
      console.error('Failed to load email details', err);
    }

    setIsEditModalOpen(true);
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setEditSubmitAttempted(true);

    // Check all required fields on submit
    const missing: string[] = [];
    if (!editFirstName.trim()) missing.push("First Name");
    if (!editLastName.trim()) missing.push("Last Name");
    if (!editSalutation.trim()) missing.push("Salutation");
    if (!editJobTitle.trim()) missing.push("Job Title");
    if (!editPositionLevel || editPositionLevel === 'unknown' || !editPositionLevel.trim()) missing.push("Position Level");
    if (!editMobilePhone.trim()) missing.push("Mobile Phone");
    if (!editContactCompanyEmail.trim()) missing.push("Company Email");
    if (!editContactPersonalEmail.trim()) missing.push("Personal Email");
    if (!editLinkedinUrl.trim()) missing.push("LinkedIn Profile URL");
    if (!editSelectedCompanyId) missing.push("Associated Company");

    if (missing.length > 0) {
      toast.error(`Harap isi semua kolom wajib: ${missing.join(", ")}`);
      return;
    }

    setSubmittingContact(true);
    try {
      await crmService.updateContact(
        editingContact.id,
        {
          salutation: editSalutation,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          positionLevel: editPositionLevel || 'unknown',
          specialityDivision: editSpecialityDivision.trim() || undefined,
          jobTitle: editJobTitle.trim() || undefined,
          mobilePhone: editMobilePhone.trim() || undefined,
          normalizedPhone: editMobilePhone.trim() ? `+62${editMobilePhone.trim().replace(/^0/, '')}` : undefined,
          linkedinUrl: editLinkedinUrl.trim() || undefined,
          contactType: editContactType,
          source: editSource,
          isActive: editIsActive
        },
        editSelectedCompanyId || undefined
      );

      // Handle Company Email
      if (editContactCompanyEmail.trim()) {
        if (editContactCompanyEmailId) {
          // Update existing company email
          try {
            await crmService.updateContactEmail(editingContact.id, editContactCompanyEmailId, {
              email: editContactCompanyEmail.trim().toLowerCase()
            });
          } catch (emailErr: any) {
            toast.warning(`Contact updated, but failed to update company email: ${emailErr.message}`);
          }
        } else {
          // Create new company email
          try {
            await crmService.addContactEmail(editingContact.id, {
              email: editContactCompanyEmail.trim().toLowerCase(),
              emailType: 'company',
              isPrimary: true,
              isVerified: true,
              isCorporate: true
            });
          } catch (emailErr: any) {
            toast.warning(`Contact updated, but failed to save company email: ${emailErr.message}`);
          }
        }
      } else if (editContactCompanyEmailId) {
        // Delete company email if cleared
        try {
          await crmService.deleteContactEmail(editingContact.id, editContactCompanyEmailId);
        } catch (emailErr: any) {
          toast.warning(`Contact updated, but failed to clear company email: ${emailErr.message}`);
        }
      }

      // Handle Personal Email
      if (editContactPersonalEmail.trim()) {
        if (editContactPersonalEmailId) {
          // Update existing personal email
          try {
            await crmService.updateContactEmail(editingContact.id, editContactPersonalEmailId, {
              email: editContactPersonalEmail.trim().toLowerCase()
            });
          } catch (emailErr: any) {
            toast.warning(`Contact updated, but failed to update personal email: ${emailErr.message}`);
          }
        } else {
          // Create new personal email
          try {
            await crmService.addContactEmail(editingContact.id, {
              email: editContactPersonalEmail.trim().toLowerCase(),
              emailType: 'personal',
              isPrimary: !editContactCompanyEmail.trim(), // Primary if company email is empty
              isVerified: true,
              isCorporate: false
            });
          } catch (emailErr: any) {
            toast.warning(`Contact updated, but failed to save personal email: ${emailErr.message}`);
          }
        }
      } else if (editContactPersonalEmailId) {
        // Delete personal email if cleared
        try {
          await crmService.deleteContactEmail(editingContact.id, editContactPersonalEmailId);
        } catch (emailErr: any) {
          toast.warning(`Contact updated, but failed to clear personal email: ${emailErr.message}`);
        }
      }

      toast.success('Contact updated successfully!');
      setIsEditModalOpen(false);
      setEditingContact(null);
      setEditContactCompanyEmail('');
      setEditContactCompanyEmailId('');
      setEditContactPersonalEmail('');
      setEditContactPersonalEmailId('');
      setEditSubmitAttempted(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update contact');
    } finally {
      setSubmittingContact(false);
    }
  };

  const openDeleteConfirm = (contact: Contact) => {
    setDeletingContact(contact);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteContact = async () => {
    if (!deletingContact) return;
    setSubmittingContact(true);
    try {
      await crmService.deleteContact(deletingContact.id);
      toast.success('Contact deleted successfully!');
      setIsDeleteConfirmOpen(false);
      setDeletingContact(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete contact');
    } finally {
      setSubmittingContact(false);
    }
  };

  const handleOpenDetailModal = async (contact: Contact) => {
    setDetailContact(contact);
    setIsDetailModalOpen(true);
    setLoadingDetailEmails(true);
    try {
      const emails = await crmService.getContactEmails(contact.id);
      setDetailEmails(emails);
    } catch (err) {
      toast.error('Failed to load contact emails');
    } finally {
      setLoadingDetailEmails(false);
    }
  };

  const handleOpenEmailModal = async (contact: Contact) => {
    setSelectedContact(contact);
    setIsEmailModalOpen(true);
    setLoadingEmails(true);
    try {
      const emails = await crmService.getContactEmails(contact.id);
      setContactEmails(emails);
    } catch (err) {
      toast.error('Failed to load emails for this contact');
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !newEmailStr.trim()) return;

    setSubmittingEmail(true);
    try {
      await crmService.addContactEmail(selectedContact.id, {
        email: newEmailStr.trim(),
        emailType,
        isPrimary,
        isVerified: false,
        isCorporate: emailType === 'company'
      });

      toast.success('Email added successfully!');
      setNewEmailStr('');
      setIsPrimary(false);
      
      // Reload emails list
      const emails = await crmService.getContactEmails(selectedContact.id);
      setContactEmails(emails);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add email address');
    } finally {
      setSubmittingEmail(false);
    }
  };

  const handleOpenTakeoutModal = (contact: Contact) => {
    setSelectedContact(contact);
    setIsTakeoutModalOpen(true);
  };

  const handleCreateTakeout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;

    setSubmittingTakeout(true);
    try {
      await crmService.createRemovalRequest({
        contactId: selectedContact.id,
        reason: removalReason,
        requestedBy: requestedBy.trim() || undefined,
        sourceDb: sourceDb.trim() || undefined,
        notes: takeoutNotes.trim() || undefined,
        status: 'done' // Automatically process soft delete on approve/done
      });

      toast.success(`${selectedContact.firstName} marked as inactive.`);
      setIsTakeoutModalOpen(false);
      setRequestedBy('');
      setSourceDb('');
      setTakeoutNotes('');
      loadData(); // Reload contacts
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit takeout request');
    } finally {
      setSubmittingTakeout(false);
    }
  };

  const isFilterActive = searchQuery || filterGroupId || filterCompanyId || filterPositionLevel || filterJobTitle;

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterGroupId('');
    setFilterCompanyId('');
    setFilterPositionLevel('');
    setFilterJobTitle('');
  };

  // Search and Advanced Filters
  const filteredContacts = contacts.filter((c) => {
    // Hide opted-out / inactive contacts from the active lists
    if (c.isActive === false) return false;

    // 1. General search query
    const query = searchQuery.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch = 
      !query ||
      fullName.includes(query) ||
      (c.company?.name && c.company.name.toLowerCase().includes(query)) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(query)) ||
      (c.mobilePhone && c.mobilePhone.includes(query)) ||
      (c.source && c.source.toLowerCase().includes(query));

    // 2. Company filter
    const matchesCompany = !filterCompanyId || (c.company?.id === filterCompanyId);

    // 3. Group filter
    const matchesGroup = !filterGroupId || (c.company?.group?.id === filterGroupId);

    // 4. Position Level filter
    const matchesPositionLevel = !filterPositionLevel || (c.positionLevel === filterPositionLevel);

    // 5. Job Title filter
    const matchesJobTitle = !filterJobTitle || (c.jobTitle && c.jobTitle.toLowerCase().includes(filterJobTitle.toLowerCase()));

    return matchesSearch && matchesCompany && matchesGroup && matchesPositionLevel && matchesJobTitle;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Contacts</h2>
          <p className="text-sm text-slate-500 mt-1">Manage contact persons, corporate roles, and corporate vs personal emails.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl shadow-sm transition-all"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            Import Excel
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Advanced Filters Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name, company, phone, source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-205 active:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all self-start md:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter by Group</label>
            <select
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white"
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter by Company</label>
            <select
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Position Level</label>
            <select
              value={filterPositionLevel}
              onChange={(e) => setFilterPositionLevel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white"
            >
              <option value="">All Levels</option>
              <option value="unknown">unknown</option>
              <option value="C-level//GM/Director">C-level//GM/Director</option>
              <option value="Manajerial/Head">Manajerial/Head</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Job Title</label>
            <input
              type="text"
              placeholder="e.g. IT Manager"
              value={filterJobTitle}
              onChange={(e) => setFilterJobTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all placeholder-slate-450 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Contacts List Table */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white shadow-sm">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">No contacts found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Create a new contact to populate the database.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Group</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone / LinkedIn</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50/30 transition-all ${!c.isActive ? 'opacity-60 bg-slate-50/20' : ''}`}>
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-slate-400 font-normal mr-0.5">{c.salutation}</span>
                        <span>{c.firstName} {c.lastName}</span>
                        {checkContactCompleteness(c).isIncomplete && (
                          <span 
                            className="inline-flex cursor-help text-amber-500 hover:text-amber-600 transition-colors"
                            title={`Semua kolom wajib diisi kecuali Division/Speciality, Contact Type, dan Data Source.\n\nKolom kosong:\n• ${checkContactCompleteness(c).missingFields.join("\n• ")}`}
                          >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                          </span>
                        )}
                      </p>
                      {!c.isActive && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-50 border border-red-100 text-red-600 rounded-md">
                          INACTIVE (OPT-OUT)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-600">
                      {c.company?.group?.name || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-4 px-6 text-sm font-semibold text-slate-700">
                      {c.company?.name || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-4 px-6 text-xs space-y-1">
                      <p className="text-slate-900 font-medium">{c.jobTitle || '-'}</p>
                      {(c.positionLevel || c.specialityDivision) && (
                        <p className="text-slate-500">
                          {c.positionLevel} ({c.specialityDivision})
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs space-y-1.5">
                      {c.mobilePhone && (
                        <p className="flex items-center gap-1 font-mono text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {c.mobilePhone}
                        </p>
                      )}
                      {c.linkedinUrl && (
                        <a
                          href={c.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-500 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          LinkedIn Profile
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-right space-x-1">
                      <button
                        onClick={() => handleOpenDetailModal(c)}
                        className="inline-flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Details (Excel Layout)"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        className="inline-flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Contact"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {c.isActive && (
                        <button
                          onClick={() => handleOpenTakeoutModal(c)}
                          className="inline-flex p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Request Takeout (Soft Delete)"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteConfirm(c)}
                        className="inline-flex p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hard Delete Contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Contact Detail Modal (EYE Icon - Excel Layout) */}
      {isDetailModalOpen && detailContact && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 text-slate-900">
            <button
              onClick={() => {
                setIsDetailModalOpen(false);
                setDetailContact(null);
                setDetailEmails([]);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Contact Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">Comprehensive end-to-end data mapped from Database Template columns.</p>
              </div>
            </div>

            <div className="space-y-6">
              {(() => {
                const comp = checkFormCompleteness(
                  detailContact.salutation || '',
                  detailContact.firstName || '',
                  detailContact.lastName || '',
                  detailContact.positionLevel || '',
                  detailContact.jobTitle || '',
                  detailContact.mobilePhone || '',
                  detailEmails.find(e => e.isCorporate || e.emailType === 'company')?.email || '',
                  detailEmails.find(e => !e.isCorporate && e.emailType === 'personal')?.email || '',
                  detailContact.linkedinUrl || '',
                  detailContact.company?.id || '',
                  companies
                );
                if (comp.isIncomplete) {
                  return (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-extrabold text-red-800">Semua kolom wajib diisi kecuali Division/Speciality, Contact Type, dan Data Source</h4>
                        <p className="text-xs text-red-600 mt-1">
                          Kolom kosong:{" "}
                          <span className="font-semibold">{comp.missingFields.join(", ")}</span>
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* SECTION A: Holding Group & Company Info */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  Holding Group & Corporate Info
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Holding Group Name</span>
                    <span className="font-bold text-slate-800">{detailContact.company?.group?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Holding Group Notes</span>
                    <span className="text-slate-600 truncate block max-w-xs" title={detailContact.company?.group?.notes}>
                      {detailContact.company?.group?.notes || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Name</span>
                    <span className="font-bold text-slate-800">{detailContact.company?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Brand</span>
                    <span className="font-medium text-slate-700">{detailContact.company?.brandName || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Industry</span>
                    <span className="font-medium text-slate-700">{detailContact.company?.industry || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">City</span>
                    <span className="font-medium text-slate-700">{detailContact.company?.city || '-'}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</span>
                    <span className="text-slate-600 block">{detailContact.company?.address || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Office Phone</span>
                    <span className="font-mono text-slate-700">{detailContact.company?.officePhone || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Website URL</span>
                    {detailContact.company?.website ? (
                      <a
                        href={detailContact.company.website.startsWith('http') ? detailContact.company.website : `https://${detailContact.company.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-500 font-semibold inline-flex items-center gap-1"
                      >
                        {detailContact.company.website}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Size (Revenue)</span>
                    <span className="font-medium text-slate-700">{detailContact.company?.companySizeRevenue || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Size (Employees)</span>
                    <span className="font-medium text-slate-700">{detailContact.company?.companySizeEmployee || '-'}</span>
                  </div>
                  <div className="md:col-span-3">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Hardware Infrastructure (Details)</span>
                    <span className="text-slate-600 whitespace-pre-wrap block mt-0.5">{detailContact.company?.companyHardware || '-'}</span>
                  </div>
                </div>
              </div>

              {/* SECTION B: Contact & Personal Info */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-slate-500" />
                  Contact Profile details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Salutation</span>
                    <span className="font-medium text-slate-700">{detailContact.salutation || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">First Name</span>
                    <span className="font-bold text-slate-800">{detailContact.firstName}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Name</span>
                    <span className="font-bold text-slate-800">{detailContact.lastName}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Job Title</span>
                    <span className="font-bold text-slate-800">{detailContact.jobTitle || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Position Level</span>
                    <span className="font-medium text-slate-700">{detailContact.positionLevel || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Speciality / Division</span>
                    <span className="font-medium text-slate-700">{detailContact.specialityDivision || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Phone</span>
                    <span className="font-mono text-slate-700">{detailContact.mobilePhone || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">LinkedIn URL</span>
                    {detailContact.linkedinUrl ? (
                      <a
                        href={detailContact.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-500 font-semibold inline-flex items-center gap-1"
                      >
                        LinkedIn Link
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Status / Opt-out</span>
                    <span className="inline-flex mt-1">
                      {detailContact.isActive !== false ? (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-100 rounded-md flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Type</span>
                    <span className="font-medium text-slate-750 capitalize">{detailContact.contactType || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Source</span>
                    <span className="font-medium text-slate-750 capitalize">{detailContact.source?.replace(/_/g, ' ') || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Created Date</span>
                    <span className="text-slate-500">
                      {detailContact.createdAt ? new Date(detailContact.createdAt).toLocaleString() : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION C: Email List */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4 text-slate-500" />
                  Email Addresses (Excel split: Corporate & Personal)
                </h4>
                {loadingDetailEmails ? (
                  <div className="py-4 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : detailEmails.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No email addresses saved for this contact profile.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {detailEmails.map((em) => (
                      <div key={em.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900 font-mono">{em.email}</p>
                          <p className="text-[10px] text-slate-500">
                            Type: <span className="capitalize">{em.emailType}</span> |{' '}
                            {em.isCorporate ? (
                              <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px]">Corporate Email</span>
                            ) : (
                              <span className="text-amber-600 font-bold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[9px]">Personal Domain Email</span>
                            )}
                          </p>
                        </div>
                        {em.isPrimary && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100 rounded-lg">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-8 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setDetailContact(null);
                  setDetailEmails([]);
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-150 text-slate-700 text-sm font-bold rounded-xl transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal Overlay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200">
            <button
              onClick={() => { setIsCreateModalOpen(false); setSubmitAttempted(false); }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Create New Contact</h3>

            {/* DYNAMIC FORM COMPLETENESS WARNING */}
            {(() => {
              const isCreateFormIncomplete = 
                !salutation.trim() ||
                !firstName.trim() ||
                !lastName.trim() ||
                (!positionLevel || positionLevel === 'unknown' || !positionLevel.trim()) ||
                !jobTitle.trim() ||
                !mobilePhone.trim() ||
                !contactCompanyEmail.trim() ||
                !contactPersonalEmail.trim() ||
                !linkedinUrl.trim() ||
                !selectedCompanyId;

              if (isCreateFormIncomplete) {
                return (
                  <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-red-800">Semua kolom wajib diisi kecuali Division/Speciality, Contact Type, dan Data Source</h5>
                    </div>
                  </div>
                );
              }
              return (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-850">Semua Kolom Wajib Terisi Lengkap</h5>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleCreateContact} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Salutation <span className="text-red-500 font-bold">*</span></label>
                  <select
                    value={salutation}
                    onChange={(e) => setSalutation(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all ${
                      submitAttempted && !salutation.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Associated Company <span className="text-red-500 font-bold">*</span></label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all ${
                      submitAttempted && !selectedCompanyId
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  >
                    <option value="">Select a Company</option>
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                  {submitAttempted && !selectedCompanyId && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Associated Company wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      submitAttempted && !firstName.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {submitAttempted && !firstName.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">First Name wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      submitAttempted && !lastName.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {submitAttempted && !lastName.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Last Name wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Title <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Manager IT"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      submitAttempted && !jobTitle.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {submitAttempted && !jobTitle.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Job Title wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Position Level <span className="text-red-500 font-bold">*</span></label>
                  <select
                    value={positionLevel}
                    onChange={(e) => setPositionLevel(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all ${
                      submitAttempted && (!positionLevel || positionLevel === 'unknown' || !positionLevel.trim())
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  >
                    <option value="unknown">unknown</option>
                    <option value="C-level//GM/Director">C-level//GM/Director</option>
                    <option value="Manajerial/Head">Manajerial/Head</option>
                    <option value="Staff">Staff</option>
                  </select>
                  {submitAttempted && (!positionLevel || positionLevel === 'unknown' || !positionLevel.trim()) && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Position Level wajib diisi (tidak boleh unknown)</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Division / Speciality</label>
                  <input
                    type="text"
                    placeholder="e.g. Infrastructure / Sales"
                    value={specialityDivision}
                    onChange={(e) => setSpecialityDivision(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile Phone <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 0812345678"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value.replace(/\D/g, ''))}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-mono ${
                      submitAttempted && !mobilePhone.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {submitAttempted && !mobilePhone.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Mobile Phone wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Email <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="email"
                    placeholder="e.g. name@company.com"
                    value={contactCompanyEmail}
                    onChange={(e) => setContactCompanyEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      submitAttempted && !contactCompanyEmail.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {submitAttempted && !contactCompanyEmail.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Company Email wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Personal Email <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="email"
                    placeholder="e.g. name@gmail.com"
                    value={contactPersonalEmail}
                    onChange={(e) => setContactPersonalEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      submitAttempted && !contactPersonalEmail.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {submitAttempted && !contactPersonalEmail.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Personal Email wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">LinkedIn Profile URL <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. https://linkedin.com/..."
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      submitAttempted && !linkedinUrl.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {submitAttempted && !linkedinUrl.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">LinkedIn Profile URL wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Type</label>
                  <select
                    value={contactType}
                    onChange={(e) => setContactType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="partner_it">Partner IT</option>
                    <option value="partner_marketing">Partner Marketing</option>
                    <option value="end_user">End User</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="contactout">ContactOut</option>
                    <option value="old_db">Old Database</option>
                    <option value="excel_import">Excel Import</option>
                    <option value="event_registration">Event Registration</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setSubmitAttempted(false); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingContact}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal Overlay */}
      {isEditModalOpen && editingContact && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingContact(null);
                setEditSubmitAttempted(false);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Edit Contact</h3>

            {/* DYNAMIC FORM COMPLETENESS WARNING */}
            {(() => {
              const isEditFormIncomplete = 
                !editSalutation.trim() ||
                !editFirstName.trim() ||
                !editLastName.trim() ||
                (!editPositionLevel || editPositionLevel === 'unknown' || !editPositionLevel.trim()) ||
                !editJobTitle.trim() ||
                !editMobilePhone.trim() ||
                !editContactCompanyEmail.trim() ||
                !editContactPersonalEmail.trim() ||
                !editLinkedinUrl.trim() ||
                !editSelectedCompanyId;

              if (isEditFormIncomplete) {
                return (
                  <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-red-800">Semua kolom wajib diisi kecuali Division/Speciality, Contact Type, dan Data Source</h5>
                    </div>
                  </div>
                );
              }
              return (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-250 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-850">Semua Kolom Wajib Terisi Lengkap</h5>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleUpdateContact} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Salutation <span className="text-red-500 font-bold">*</span></label>
                  <select
                    value={editSalutation}
                    onChange={(e) => setEditSalutation(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all ${
                      editSubmitAttempted && !editSalutation.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Associated Company <span className="text-red-500 font-bold">*</span></label>
                  <select
                    value={editSelectedCompanyId}
                    onChange={(e) => setEditSelectedCompanyId(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all ${
                      editSubmitAttempted && !editSelectedCompanyId
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  >
                    <option value="">Select a Company</option>
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                  {editSubmitAttempted && !editSelectedCompanyId && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Associated Company wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. John"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      editSubmitAttempted && !editFirstName.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {editSubmitAttempted && !editFirstName.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">First Name wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Doe"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      editSubmitAttempted && !editLastName.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {editSubmitAttempted && !editLastName.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Last Name wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Title <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Manager IT"
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      editSubmitAttempted && !editJobTitle.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {editSubmitAttempted && !editJobTitle.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Job Title wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Position Level <span className="text-red-500 font-bold">*</span></label>
                  <select
                    value={editPositionLevel}
                    onChange={(e) => setEditPositionLevel(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all ${
                      editSubmitAttempted && (!editPositionLevel || editPositionLevel === 'unknown' || !editPositionLevel.trim())
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  >
                    <option value="unknown">unknown</option>
                    <option value="C-level//GM/Director">C-level//GM/Director</option>
                    <option value="Manajerial/Head">Manajerial/Head</option>
                    <option value="Staff">Staff</option>
                  </select>
                  {editSubmitAttempted && (!editPositionLevel || editPositionLevel === 'unknown' || !editPositionLevel.trim()) && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Position Level wajib diisi (tidak boleh unknown)</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Division / Speciality</label>
                  <input
                    type="text"
                    placeholder="e.g. IT / Marketing"
                    value={editSpecialityDivision}
                    onChange={(e) => setEditSpecialityDivision(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile Phone <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 0812345678"
                    value={editMobilePhone}
                    onChange={(e) => setEditMobilePhone(e.target.value.replace(/\D/g, ''))}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-mono ${
                      editSubmitAttempted && !editMobilePhone.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {editSubmitAttempted && !editMobilePhone.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Mobile Phone wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Email <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="email"
                    placeholder="e.g. name@company.com"
                    value={editContactCompanyEmail}
                    onChange={(e) => setEditContactCompanyEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      editSubmitAttempted && !editContactCompanyEmail.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {editSubmitAttempted && !editContactCompanyEmail.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Company Email wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Personal Email <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="email"
                    placeholder="e.g. name@gmail.com"
                    value={editContactPersonalEmail}
                    onChange={(e) => setEditContactPersonalEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      editSubmitAttempted && !editContactPersonalEmail.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {editSubmitAttempted && !editContactPersonalEmail.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">Personal Email wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">LinkedIn Profile URL <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. https://linkedin.com/..."
                    value={editLinkedinUrl}
                    onChange={(e) => setEditLinkedinUrl(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                      editSubmitAttempted && !editLinkedinUrl.trim()
                        ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  {editSubmitAttempted && !editLinkedinUrl.trim() && (
                    <p className="text-red-500 text-[11px] mt-1 font-semibold">LinkedIn Profile URL wajib diisi</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Type</label>
                  <select
                    value={editContactType}
                    onChange={(e) => setEditContactType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="partner_it">Partner IT</option>
                    <option value="partner_marketing">Partner Marketing</option>
                    <option value="end_user">End User</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data Source</label>
                  <select
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="contactout">ContactOut</option>
                    <option value="old_db">Old Database</option>
                    <option value="excel_import">Excel Import</option>
                    <option value="event_registration">Event Registration</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-50 border-slate-200 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="editIsActive" className="text-sm font-semibold text-slate-700">
                    Active (Allowed to target)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingContact(null);
                    setEditSubmitAttempted(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingContact}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Emails Modal Overlay */}
      {isEmailModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 flex flex-col text-slate-900">
            <button
              onClick={() => setIsEmailModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-1">Emails for {selectedContact.firstName}</h3>
            <p className="text-xs text-slate-500 mb-6">Manage company or personal emails for lead targeting.</p>

            {/* List of current emails */}
            <div className="space-y-3 mb-6 bg-slate-50 p-4 border border-slate-200 rounded-xl max-h-[200px] overflow-y-auto">
              {loadingEmails ? (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : contactEmails.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-4">No email addresses added yet.</p>
              ) : (
                contactEmails.map((em) => (
                  <div key={em.id} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono">
                    <div className="space-y-0.5">
                      <p className="text-slate-900 font-bold">{em.email}</p>
                      <p className="text-[10px] text-slate-500">
                        Type: <span className="capitalize">{em.emailType}</span> |{' '}
                        {em.isCorporate ? (
                          <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px]">Corporate Email</span>
                        ) : (
                          <span className="text-amber-600 font-bold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[9px]">Personal Domain Email</span>
                        )}
                      </p>
                    </div>
                    {em.isPrimary && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold border border-blue-100 rounded-md">
                        Primary
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add new email form */}
            <form onSubmit={handleAddEmail} className="space-y-4 border-t border-slate-100 pt-4">
              <h4 className="font-bold text-sm text-slate-900">Add New Email Address</h4>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={newEmailStr}
                  onChange={(e) => setNewEmailStr(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm font-mono focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Type</label>
                  <select
                    value={emailType}
                    onChange={(e) => setEmailType(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="company">Company</option>
                    <option value="personal">Personal</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-50 border-slate-200 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isPrimary" className="text-xs font-semibold text-slate-700">
                    Set as Primary Email
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submittingEmail}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Add Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Takeout Modal Overlay */}
      {isTakeoutModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
            <button
              onClick={() => setIsTakeoutModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Request Data Takeout</h3>
              <p className="text-xs text-slate-500 mt-1">
                Proceeding will mark <strong>{selectedContact.firstName} {selectedContact.lastName}</strong> as inactive.
              </p>
            </div>

            <form onSubmit={handleCreateTakeout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Removal Reason</label>
                <select
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                >
                  <option value="resign">Resign</option>
                  <option value="pensiun">Pensiun</option>
                  <option value="meninggal">Meninggal</option>
                  <option value="requested_takeout">Requested Takeout</option>
                  <option value="pindah_kerja">Pindah Kerja</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Requested By</label>
                  <input
                    type="text"
                    placeholder="User name"
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Source Database</label>
                  <input
                    type="text"
                    placeholder="e.g. old_pms"
                    value={sourceDb}
                    onChange={(e) => setSourceDb(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Takeout Notes</label>
                <textarea
                  placeholder="Additional removal context..."
                  value={takeoutNotes}
                  onChange={(e) => setTakeoutNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none resize-none focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsTakeoutModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTakeout}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingTakeout ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Confirm Takeout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {isDeleteConfirmOpen && deletingContact && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hard Delete Contact</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to permanently delete contact <span className="font-semibold text-slate-800">"{deletingContact.firstName} {deletingContact.lastName}"</span>? 
              This will completely erase the contact and all associated emails, event leads, and removal request logs. This action is irreversible.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeletingContact(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                disabled={submittingContact}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteContact}
                disabled={submittingContact}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {submittingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal Overlay */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
            <button
              onClick={() => {
                setIsImportModalOpen(false);
                setSelectedImportFile(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-605 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Import Contacts from Excel</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload your database template spreadsheet to bulk import groups, companies, and contacts.
              </p>
              <div className="mt-3">
                <a
                  href="/Database_Template.xlsx"
                  download="Database_Template.xlsx"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Database Template (.xlsx)
                </a>
              </div>
            </div>

            <form onSubmit={handleImportExcel} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative group">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedImportFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={importingExcel}
                />
                <div className="p-2.5 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-500 rounded-xl transition-all">
                  <Upload className="w-5 h-5" />
                </div>
                {selectedImportFile ? (
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-800 break-all">{selectedImportFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedImportFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">Click or drag Excel template here</p>
                    <p className="text-xs text-slate-400 mt-0.5">Supports .xlsx and .xls formats</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setSelectedImportFile(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                  disabled={importingExcel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importingExcel || !selectedImportFile}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {importingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Import Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

