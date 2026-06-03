update public.jobs as j
set required_skills = fixes.required_skills
from (
  values
    ('351c32c5-2d25-40ff-8a4d-8408df62b9ca'::uuid, array['Communication','Teamwork']::text[]),
    ('3edfc5fc-780d-47b2-be2c-ef981ff49867'::uuid, array['Communication','Teamwork','Documentation']::text[]),
    ('b14c1419-cb38-42db-a8f4-faf2c4123c0b'::uuid, array['Communication','Teamwork','Documentation']::text[]),
    ('c7713ab0-1bb6-4b54-a7f1-4d9e84a035fd'::uuid, array['Communication','Teamwork','Documentation']::text[]),
    ('5aac9406-b6a2-4bc7-b86a-a3bbf4486a10'::uuid, array['Communication','Teamwork']::text[]),
    ('35eaa43b-2e9a-4131-972f-9e941bfa71dd'::uuid, array['Network','Technical Support','Linux','Documentation']::text[]),
    ('b89189e2-4283-4607-bd76-4793c24c8bd8'::uuid, array['Network','Technical Support','Linux','Documentation']::text[]),
    ('ba2f4e59-3321-489e-98d7-37b062503395'::uuid, array['Business Analysis','Analytics','Documentation','Communication']::text[]),
    ('0370a9cc-cc61-42f4-8fb9-7082419d7c4d'::uuid, array['Communication','Teamwork','Documentation','Analytics']::text[]),
    ('498b6b8f-0197-413a-9c56-f8dd95c6b593'::uuid, array['Communication','Teamwork','Sales','Documentation']::text[]),
    ('f0db996e-150f-4106-bf89-528477df68ac'::uuid, array['Marketing','Communication','Social Media','Teamwork']::text[]),
    ('f9f41758-23e1-4a32-ac35-82e33763ee8b'::uuid, array['Communication','Teamwork','Documentation']::text[]),
    ('7e9597f9-9b39-4bd3-a013-4d6498218647'::uuid, array['Java','Javascript','Git','Sql']::text[]),
    ('a50be2b8-d0b1-46eb-874e-56f6d404c1a0'::uuid, array['Analytics','Sql','Excel']::text[]),
    ('5af9e07e-4a19-4802-82a9-8d0c4ade5a3e'::uuid, array['Java','Javascript','Git','Testing']::text[]),
    ('5596dc40-f66e-4196-859a-d0f6aeef0721'::uuid, array['Html','Css','Javascript','Php']::text[]),
    ('9a48aa49-5004-4a18-9c9c-5146673c81be'::uuid, array['React','Javascript','Css','Html']::text[]),
    ('be93659c-0554-423f-a11e-24704209147a'::uuid, array['Html','Css','Javascript','Php']::text[]),
    ('fc5a8e0b-0af8-4adf-af5b-c0724c1a4234'::uuid, array['Graphic Design','Html','Css','Javascript']::text[]),
    ('ceb3ff58-9eff-4c89-8e46-ba3725af2e9f'::uuid, array['Html','Css','Javascript','React']::text[]),
    ('7a66a574-0ab6-4462-bab2-e4bec7b1845c'::uuid, array['Python','Java','Sql','Git']::text[]),
    ('07399325-8bd0-44c3-970d-e15a3b97c7ac'::uuid, array['Javascript','Typescript','React','Css']::text[]),
    ('9af9e32c-c13d-4f7d-a8bb-dfeadf95fef2'::uuid, array['React','Javascript','Css','Html']::text[]),
    ('0430777b-22af-43bc-8a14-984b03d223ea'::uuid, array['Javascript','Git','Sql','Testing']::text[])
) as fixes(id, required_skills)
where j.id = fixes.id
  and coalesce(array_length(j.required_skills, 1), 0) = 0;
