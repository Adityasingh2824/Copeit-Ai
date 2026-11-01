import { ChevronDown, House, LogIn, LogOut, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function ProfileMenu({ user, onHome, onWorkspace, onSignIn, onSignOut, compact = false }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const initial = user?.email?.[0]?.toUpperCase() || 'C';

  useEffect(() => {
    const close = event => { if (!menuRef.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);

  const choose = action => { setOpen(false); action?.(); };
  return <div className={`profile-menu ${compact ? 'compact' : ''}`} ref={menuRef}>
    <button className="profile-trigger" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-haspopup="menu">
      <span className="profile-avatar">{initial}</span>
      {!compact && <span className="profile-trigger-copy"><strong>{user?.email ? user.email.split('@')[0] : 'Account'}</strong><small>{user?.email ? 'Pilot access' : 'Explore Copeit'}</small></span>}
      <ChevronDown size={15}/>
    </button>
    {open && <div className="profile-popover" role="menu">
      {user?.email ? <><div className="profile-identity"><UserRound size={15}/><span><strong>{user.email}</strong><small>Verified pilot account</small></span></div><button type="button" role="menuitem" onClick={() => choose(onWorkspace)}><UserRound size={15}/>Workspace</button></> : <div className="profile-identity"><UserRound size={15}/><span><strong>Copeit account</strong><small>Sign in to join a pilot workspace</small></span></div>}
      <button type="button" role="menuitem" onClick={() => choose(onHome)}><House size={15}/>Home</button>
      {user?.email ? <button type="button" role="menuitem" className="profile-signout" onClick={() => choose(onSignOut)}><LogOut size={15}/>Sign out</button> : <button type="button" role="menuitem" className="profile-signin" onClick={() => choose(onSignIn)}><LogIn size={15}/>Sign in</button>}
    </div>}
  </div>;
}
