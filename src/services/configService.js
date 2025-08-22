// Configuration related API calls (default & user-specific claim limits)
// Keeps raw axios usage out of view components.
import api from '@/api/axios'

export async function getConfig(){
  const { data } = await api.get('/api/config')
  return data?.config || data
}

export async function saveConfig(payload){
  const { data } = await api.put('/api/config', payload)
  return data?.config || data
}

export async function updateDefaultLimit(defaultLimit){
  if(defaultLimit == null || defaultLimit < 0) throw new Error('updateDefaultLimit: invalid value')
  const { data } = await api.put('/api/config/default-limit', { defaultLimit: Number(defaultLimit) })
  return data
}

export async function updateUserLimit({ email, limit, used }){
  if(!email) throw new Error('updateUserLimit: email required')
  if(limit == null || limit < 0) throw new Error('updateUserLimit: invalid limit')
  if(used == null || used < 0) throw new Error('updateUserLimit: invalid used amount')
  const { data } = await api.put('/api/config/user-limit', { email, limit: Number(limit), used: Number(used) })
  return data
}

export default {
  getConfig,
  saveConfig,
  updateDefaultLimit,
  updateUserLimit
}
