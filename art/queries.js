const AuthError = require('./errors').AuthError;
const InputError = require('./errors').InputError;
const csv = require('csv-express');

module.exports = {
	upsertArtist,
	getArtist,
	getWork,
	getWorks,
	createWork,
	updateWork,
	removeWork,
  exportArtists
};

function access(req) {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 0) return Promise.reject(new InputError('Bad id number'));
  if (!req.session || !req.session.user || !req.session.user.email) return Promise.reject(new AuthError());
  return req.app.locals.db.oneOrNone('SELECT email FROM members.People WHERE id = $1', id)
    .then(data => {
      if (!data || !req.session.user.art_admin && req.session.user.email !== data.email) throw new AuthError();
      return {
        id,
      };
    });
}

function getArtist(req, res, next) {
  access(req)
    .then(({ id }) => req.app.locals.db.oneOrNone(`SELECT * FROM Artist WHERE people_id = $1`, id))
    .then(data => res.status(200).json(data || {}))
    .catch(next);
}

function upsertArtist(req, res, next) {
  access(req)
    .then(({ id }) => {
      const artist = Object.assign({}, req.body, { people_id: id });
      const keys = [
        'people_id', 'name', 'continent', 'url', 'filename', 'filedata',
        'category', 'description', 'transport', 'auction', 'print', 'digital',
        'legal', 'agent', 'contact', 'waitlist', 'postage','half'
      ].filter(key => artist.hasOwnProperty(key));
      const insertValues = keys.map(key => `$(${key})`).join(', ');
      const insertArtist = `(${keys.join(', ')}) VALUES(${insertValues})`;
      const updateArtist = keys.map(key => `${key}=$(${key})`).join(', ');
      return req.app.locals.db.one(`
        INSERT INTO Artist ${insertArtist}
        ON CONFLICT (people_id)
          DO UPDATE SET ${updateArtist}
          RETURNING people_id`, artist)
    })
    .then(people_id => res.status(200).json({ status: 'success', people_id }))
    .catch(next);
}


/**** WORKS ***/

function getWorks(req, res, next) {
  access(req)
    .then(({ id }) => req.app.locals.db.any(`SELECT * FROM Works WHERE people_id=$1`, id))
    .then(data => res.status(200).json(data))
    .catch(next);
}

function getWork(req, res, next) {
  access(req)
    .then(({ id }) => {
      const params = Object.assign({}, req.params, { people_id: id });
      req.app.locals.db.one(`SELECT * FROM Works WHERE id=$(work) AND people_id=$(people_id)`, params)
    })
    .then(data => res.status(200).json(data))
    .catch(next);
}

function createWork(req, res, next) {
  access(req)
    .then(({ id }) => {
      const work = Object.assign({}, req.body, { people_id: id });
      const keys = [
        'people_id', 'title', 'width', 'height', 'depth', 'gallery','original',
        'orientation', 'technique', 'filename', 'filedata', 'year', 'price','start','sale','copies','form','permission'
      ].filter(key => work.hasOwnProperty(key));
      const insertValues = keys.map(key => `$(${key})`).join(', ');
      return req.app.locals.db.one(`
        INSERT INTO Works
                    (${keys.join(', ')})
             VALUES (${insertValues})
          RETURNING id`, work);
    })
    .then(({ id }) => res.status(200).json({ status: 'success', inserted: id }))
    .catch(next);
}

function updateWork(req, res, next) {
  access(req)
    .then(({ id }) => {
      const work = Object.assign({}, req.body, {
        people_id: id,
        work: req.params.work
      });
      const keys = [
        'people_id', 'title', 'width', 'height', 'depth', 'gallery','original',
        'orientation', 'technique', 'filename', 'filedata', 'year', 'price','start','sale','copies','form','permission'
      ].filter(key => work.hasOwnProperty(key));
      const updateWork = keys.map(key => `${key}=$(${key})`).join(', ');
      return req.app.locals.db.none(`
        UPDATE Works
           SET ${updateWork}
         WHERE id=$(work) AND people_id=$(people_id)`, work);
    })
    .then(() => res.status(200).json({ status: 'success' }))
    .catch(next);
}

function removeWork(req, res, next) {
  access(req)
    .then(({ id }) => req.app.locals.db.result(`
      DELETE FROM Works
       WHERE id=$(work) AND people_id=$(people_id)`,
      { people_id: id, work: req.params.work }
    ))
    .then(() => res.status(200).json({ status: 'success' }))
    .catch(next);
}

/**** export CSV ****/

function exportArtists(req, res, next) {
     if (!req.session.user.art_admin) return res.status(401).json({ status: 'unauthorized' });
    req.app.locals.db.any(`
    SELECT p.member_number, p.membership, p.legal_name, p.email, p.city, p.country,
        a.name, a.continent, a.url,
        a.category, a.description, a.transport, a.auction, a.print, a.digital, a.half,
        a.legal, a.agent, a.contact, a.waitlist, a.postage 
        FROM Artist as a, members.people as p WHERE a.people_id = p.ID order by p.member_number
    `)
    .then((data) => res.status(200).csv(data, true))
    .catch(next)
}
