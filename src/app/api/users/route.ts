import { NextResponse } from 'next/server';

export interface AppUser {
  id: string;
  name: string;
  role: 'ent_specialist' | 'audiologist' | 'patient' | 'caregiver';
  mrnOrHprId: string;
  email?: string;
  phone?: string;
  hospitalOrDept?: string;
  age?: number;
  gender?: string;
  registeredAt: string;
  isDefault?: boolean;
}

// In-memory store initialized with the 3 default hardcoded users
let appUsersStore: AppUser[] = [
  {
    id: 'doc_101',
    name: 'Dr. Vishal Gaurav',
    role: 'ent_specialist',
    mrnOrHprId: 'HPR-IN-987654',
    email: 'dr.vishal.gaurav@commandhospital.in',
    phone: '+91 98765 43210',
    hospitalOrDept: 'Command Hospital (SC) Pune / Base Hospital New Delhi',
    registeredAt: new Date('2026-01-01').toISOString(),
    isDefault: true,
  },
  {
    id: 'aud_101',
    name: 'Mr Lokanath Sahoo',
    role: 'audiologist',
    mrnOrHprId: 'AUD-IN-88412',
    email: 'lokanath.sahoo@commandhospital.in',
    phone: '+91 98765 12345',
    hospitalOrDept: 'Department of Audiology & Neuro-Otology',
    registeredAt: new Date('2026-01-01').toISOString(),
    isDefault: true,
  },
  {
    id: 'pt_101',
    name: 'Sachin Srivastava',
    role: 'patient',
    mrnOrHprId: 'MRN: 88491',
    email: 'sachin.srivastava@abdm.in',
    phone: '+91 98765 67890',
    hospitalOrDept: 'Command Hospital ENT OPD',
    age: 42,
    gender: 'Male',
    registeredAt: new Date('2026-01-01').toISOString(),
    isDefault: true,
  },
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const roleFilter = url.searchParams.get('role');

    let result = appUsersStore;
    if (roleFilter) {
      result = appUsersStore.filter((u) => u.role === roleFilter);
    }

    return NextResponse.json({
      success: true,
      users: result,
      total: result.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, role, mrnOrHprId, email, phone, hospitalOrDept, age, gender } = body;

    if (!name || !role) {
      return NextResponse.json(
        { success: false, error: 'User name and role are required.' },
        { status: 400 }
      );
    }

    const newUser: AppUser = {
      id: `${role.slice(0, 3)}_${Date.now()}`,
      name: name.trim(),
      role,
      mrnOrHprId: mrnOrHprId ? mrnOrHprId.trim() : `ID-${Math.floor(10000 + Math.random() * 90000)}`,
      email: email ? email.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      hospitalOrDept: hospitalOrDept ? hospitalOrDept.trim() : 'ENT Department',
      age: age ? Number(age) : undefined,
      gender: gender ? gender.trim() : undefined,
      registeredAt: new Date().toISOString(),
      isDefault: false,
    };

    appUsersStore.push(newUser);

    return NextResponse.json({
      success: true,
      message: `New user ${newUser.name} (${newUser.role}) successfully registered at backend.`,
      user: newUser,
      users: appUsersStore,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
