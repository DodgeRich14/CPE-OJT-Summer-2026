update public.jobs as j
set required_skills = fixes.required_skills
from (
  values
    ('fbab30cc-2820-4449-8130-f60340c32921'::uuid, array['HR','Administration','Recruitment','Documentation','Communication']::text[]),
    ('50c9b6a3-4cc5-46e4-b830-c2ee3158d51e'::uuid, array['HR','Administration','Recruitment','Documentation','Communication']::text[]),
    ('107bbd9c-f847-486f-9f19-c618b896d86a'::uuid, array['HR','Accounting','Administration','Mechanical Engineering','Industrial Engineering']::text[])
) as fixes(id, required_skills)
where j.id = fixes.id;
