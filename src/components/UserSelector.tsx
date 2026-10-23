import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  listUsers,
  currentUser,
  currentUid,
  switchUser,
  addUser,
  renameUser,
  removeUser,
  cleanUserName
} from '../services/users';

interface UserSelectorProps {
  onUserChanged?: () => void;
}

export const UserSelector: React.FC<UserSelectorProps> = ({ onUserChanged }) => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User>(currentUser());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [armingDeleteId, setArmingDeleteId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setUsers(listUsers());
    setActiveUser(currentUser());
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingId(null);
        setArmingDeleteId(null);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const handleSwitch = (id: string) => {
    switchUser(id);
    refresh();
    setOpen(false);
    onUserChanged && onUserChanged();
    window.location.reload();
  };

  const handleStartRename = (u: User) => {
    setEditingId(u.id);
    setEditName(u.name);
    setArmingDeleteId(null);
  };

  const handleSaveRename = (id: string) => {
    const n = cleanUserName(editName);
    if (n) {
      renameUser(id, n);
      setEditingId(null);
      refresh();
    }
  };

  const handleAddUser = () => {
    const n = cleanUserName(newUserName);
    if (!n) return;
    const newId = addUser(n);
    switchUser(newId);
    setNewUserName('');
    setOpen(false);
    onUserChanged && onUserChanged();
    window.location.reload();
  };

  const handleConfirmDelete = (id: string) => {
    removeUser(id);
    setArmingDeleteId(null);
    setConfirmName('');
    refresh();
  };

  const curId = currentUid();

  return (
    <div className="mvu" ref={panelRef}>
      <button
        type="button"
        className="mvu-chip"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setEditingId(null);
          setArmingDeleteId(null);
        }}
        title="Cambiar de usuario"
      >
        <span>👤 {activeUser.name}</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="mvu-panel">
          <div className="label">¿Quién usa la app?</div>
          <p className="note" style={{ margin: 0 }}>
            Cada persona tiene sus propias sílabas, versiones, textos de inglés y ajustes. Al cambiar, lo de cada uno queda guardado hasta que vuelva.
          </p>

          {users.map(u => (
            <div key={u.id} className="mvu-row">
              {editingId === u.id ? (
                <>
                  <input
                    value={editName}
                    maxLength={24}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveRename(u.id);
                    }}
                    aria-label="Nuevo nombre"
                    autoFocus
                  />
                  <button className="primary" onClick={() => handleSaveRename(u.id)}>
                    Guardar
                  </button>
                  <button className="ghost" onClick={() => setEditingId(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="nm">
                    {u.name}
                    {u.id === curId && <small> · ahora</small>}
                    {u.id === 'main' && <small> · principal</small>}
                  </span>

                  {u.id !== curId && (
                    <button className="primary" onClick={() => handleSwitch(u.id)}>
                      Usar
                    </button>
                  )}

                  <button className="ghost" onClick={() => handleStartRename(u)}>
                    Renombrar
                  </button>

                  {u.id !== 'main' && u.id !== curId && (
                    <>
                      <button
                        className="ghost"
                        onClick={() => {
                          setArmingDeleteId(armingDeleteId === u.id ? null : u.id);
                          setConfirmName('');
                        }}
                      >
                        Eliminar
                      </button>

                      {armingDeleteId === u.id && (
                        <div style={{ flexBasis: '100%', marginTop: 6, display: 'grid', gap: 6 }}>
                          <div className="mvu-warn">
                            Se borrarán para siempre las sílabas, textos y palabras de {u.name} en este aparato. Escribe su nombre para confirmar:
                          </div>
                          <div className="row">
                            <input
                              placeholder={u.name}
                              value={confirmName}
                              onChange={e => setConfirmName(e.target.value)}
                              aria-label="Escribe el nombre para confirmar"
                            />
                            <button
                              className="recbtn"
                              disabled={confirmName.trim().toLowerCase() !== u.name.toLowerCase()}
                              onClick={() => handleConfirmDelete(u.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ))}

          <div className="mvu-add">
            <input
              placeholder="Nombre del nuevo usuario"
              maxLength={24}
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddUser();
              }}
              aria-label="Nombre del nuevo usuario"
            />
            <button onClick={handleAddUser}>+ Añadir y usar</button>
          </div>

          <p className="note" style={{ margin: 0 }}>
            Todo se guarda solo en este navegador. Para pasar la voz de alguien a otro aparato, usa su copia de seguridad.
          </p>
        </div>
      )}
    </div>
  );
};
