USE [WAD-MMD-CSD-S21_10407721] --db user login
GO
--DB prefix "mtg"
--Drop tables in reverse order of creation. SQL requires you to drop dependencies (foreign keys) before the table can be dropped
--Drop order matters!
ALTER TABLE dbo.mtgPassword
DROP CONSTRAINT IF EXISTS mtgFK_Password_Account
GO
DROP TABLE IF EXISTS dbo.mtgPassword
GO
ALTER TABLE dbo.mtgAccount
DROP CONSTRAINT IF EXISTS mtgFK_Account_Role
GO
DROP TABLE IF EXISTS dbo.mtgAccount
GO
DROP TABLE IF EXISTS dbo.mtgRole
GO
ALTER TABLE dbo.mtgCardtable
DROP CONSTRAINT IF EXISTS cardFK_mtgCardtable_mtgCardsubtype
GO
DROP TABLE IF EXISTS dbo.mtgCardtable
GO
ALTER TABLE dbo.mtgCardsubtype
DROP CONSTRAINT IF EXISTS cardFK_cardSubtype_maintype
GO
DROP TABLE IF EXISTS dbo.mtgCardsubtype
GO
DROP TABLE IF EXISTS dbo.cardMaintype
GO
-- this process is executed with every connection to db





--Table creation. table order matters!
--Card related tables
CREATE TABLE dbo.cardMaintype
(
    --Primary key maintypeid
    maintypeid INT NOT NULL IDENTITY PRIMARY KEY,
    maintitle NVARCHAR(50) NOT NULL
);
GO 

CREATE TABLE dbo.mtgCardsubtype
(
    --Primary key subtypeid
    subtypeid INT NOT NULL IDENTITY PRIMARY KEY,
    subtitle NVARCHAR(50) NOT NULL,  
    FK_maintypeid INT NOT NULL,
    --foreign key points from subtype to maintype
    CONSTRAINT cardFK_cardSubtype_maintype FOREIGN KEY (FK_maintypeid) REFERENCES cardMaintype (maintypeid)
);
GO
CREATE TABLE dbo.mtgCardtable
(
    --Primary key cardid
    cardid INT NOT NULL IDENTITY PRIMARY KEY, 
    title NVARCHAR(50) NOT NULL UNIQUE,
    manacost NVARCHAR(50) NOT NULL,
    power NVARCHAR(50), 
    toughness NVARCHAR(50), 
    link NVARCHAR(500) NOT NULL,
    ability NVARCHAR(255),
    flavortext NVARCHAR(255),
    --cardstatus could have been in separate table with FK references
    cardstatus NVARCHAR(50) NOT NULL DEFAULT 'hidden', --default status is hidden for the average user. Moderators will see hidden and visible cards 
    FK_subtypeid INT NOT NULL,
    --foreign key points from cardtable to subtype
    CONSTRAINT cardFK_mtgCardtable_mtgCardsubtype FOREIGN KEY (FK_subtypeid) REFERENCES mtgCardsubtype (subtypeid)    
);
GO


--role, account and login

CREATE TABLE dbo.mtgRole
(
    --Primary key roleid
    roleid INT NOT NULL IDENTITY PRIMARY KEY,
    rolename NVARCHAR(50) NOT NULL,
    roledescription NVARCHAR(255)
);
GO
CREATE TABLE dbo.mtgAccount
(
    --Primary key accountid
    accountid INT NOT NULL IDENTITY PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    FK_roleid INT NOT NULL DEFAULT 1,
    --foreign key points from account to role
    CONSTRAINT mtgFK_Account_Role FOREIGN KEY (FK_roleid) REFERENCES mtgRole (roleid)
);
GO
CREATE TABLE dbo.mtgPassword
(
    FK_accountid INT NOT NULL UNIQUE,
    hashedpassword NVARCHAR(255) NOT NULL,
    --foreign key points from password to account
    CONSTRAINT mtgFK_Password_Account FOREIGN KEY (FK_accountid) REFERENCES mtgAccount (accountid)
);
GO

--populating db with initial data for testing
--populate the database with cards from our own deck as a start. 
--populate mtgRole with role and description
--populate mtgAccount with email, loginname, roleid
--populate mtgPassword with FK_accountid and hashedpassword

-- CARDS
--populating maintype
INSERT INTO cardMaintype
    ([maintitle])
VALUES
    ('Creature'),
    ('Instant')
GO
--populating subtype
INSERT INTO mtgCardsubtype
    ([subtitle], [FK_maintypeid])
VALUES
    ('Arcane', 2),
    ('Rat Ninja', 1),
    ('Demon Spirit', 1),
    ('Spirit', 1),
    ('Ogre Warrior', 1)
GO
--populating cardtable
INSERT INTO mtgCardtable
    ([title], [manacost], [power], [toughness],[link],[ability],[flavortext],[cardstatus],[FK_subtypeid])
VALUES
    ('Okiba-Gang Shinobi', '{3A}{2B}/{5}','{3}','{2}', 'https://gatherer.wizards.com/pages/card/Details.aspx?multiverseid=423460', 'Ninjutsu 3Black (3Black, Return an unblocked attacker you control to hand: Put this card onto the battlefield from your hand tapped and attacking.)
Whenever Okiba-Gang Shinobi deals combat damage to a player, that player discards two cards.', NULL, 'visible', 2),
    ('Frost Ogre', '{3A}{2F}/{5}','{5}','{3}', 'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=74589', NULL, 'Mountain ogres allowed blizzards to sheathe them in ice, both to reinforce their armor and to hide their pungent musk from potential prey.','visible', 5),
    ('Painwracker Oni', '{3A}{2B}/{5}','{5}','{4}', 'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=79119', 'Fear, At the beginning of your upkeep, sacrifice a creature if you dont control an Ogre.', 'Blood flows. Blood calls. Blood devours all and only blood remains.','visible', 3),
    ('Torrent of Stone', '{3A}{1F}/{4}','{0}','{0}', 'https://gatherer.wizards.com/pages/card/Details.aspx?multiverseid=423460', 'Torrent of Stone deals 4 damage to target creature. / Splice onto Arcane—Sacrifice two Mountains. (As you cast an Arcane spell, you may reveal this card from your hand and pay its splice cost. If you do, add this cards effects to that spell.)', NULL,'visible', 1),
    ('Child of Thorns', '{0}{1G}/{1}','{1}','{1}', 'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=74461', 'Sacrifice Child of Thorns: Target creature gets +1/+1 until end of turn.', 'The soratami scoff at the perils of Jukai, calling the forest an "unruly garden." Perhaps we should send them a rose such as this.','visible', 4)
GO
--test table for deleting and updating part of CRUD //potentially removed before deployment
INSERT INTO mtgCardtable
    ([title], [manacost], [power], [toughness],[link],[ability],[flavortext],[FK_subtypeid])
VALUES

    ('Child of ThornsFDFSDFS', '{0}{1G}/{1}','{1}','{1}', 'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=74461', 'Sacrifice Child of Thorns: Target creature gets +1/+1 until end of turn.', 'The soratami scoff at the perils of Jukai, calling the forest an "unruly garden." Perhaps we should send them a rose such as this.', 4)
GO
-- -- populating login tables
 --mtgRole
INSERT INTO mtgRole
    ([rolename], [roledescription])
VALUES
    ('moderator', 'can change status of cards / delete cards'),
    ('admin', 'can purge unruly mods')
GO
--mtgAccount
INSERT INTO mtgAccount
    ([email],[FK_roleid])
VALUES
    ('test123@google.com', 1),
    ('iliketrains123@google.com', 1),
    ('lordadmin@google.com', 2)
GO
--mtgPassword
INSERT INTO mtgPassword
    ([FK_accountid], [hashedpassword])
VALUES
    (1, '$2y$08$e4BC4UkoV0PXF6aTIgFi.ueD2P3/PQ71yZEqBNWI3p154tHrGIbhK'),
    (2, '$2y$08$r2L3QNc0NpLYsAOO/YIHFOL7t39xPLWhrNOaU5iYvFwjLRliUIgCq'),
    (3, '$2y$08$KOkOyCmxTipjyM29t3rrD.XEPhZyH4LuG1iYKki4/BAylJpF5FtcS')
GO
/* 
--cost factor 8 /Bcrypt
    plain {
        "test"
        "trains"
        "admin"
    }

    hashed {
        "$2y$08$e4BC4UkoV0PXF6aTIgFi.ueD2P3/PQ71yZEqBNWI3p154tHrGIbhK"
        "$2y$08$r2L3QNc0NpLYsAOO/YIHFOL7t39xPLWhrNOaU5iYvFwjLRliUIgCq"
        "$2y$08$KOkOyCmxTipjyM29t3rrD.XEPhZyH4LuG1iYKki4/BAylJpF5FtcS"
    }
*/

