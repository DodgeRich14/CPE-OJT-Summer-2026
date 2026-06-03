with skill_keywords(keyword, normalized) as (
  values
    ('react', 'React'),
    ('typescript', 'Typescript'),
    ('javascript', 'Javascript'),
    ('node.js', 'Node.js'),
    ('node', 'Node.js'),
    ('sql', 'Sql'),
    ('postgresql', 'Postgresql'),
    ('firebase', 'Firebase'),
    ('tailwind', 'Tailwind'),
    ('css', 'Css'),
    ('html', 'Html'),
    ('graphql', 'Graphql'),
    ('next.js', 'Next.js'),
    ('next', 'Next.js'),
    ('aws', 'Aws'),
    ('docker', 'Docker'),
    ('git', 'Git'),
    ('rest api', 'Rest Api'),
    ('figma', 'Figma'),
    ('python', 'Python'),
    ('java', 'Java'),
    ('c#', 'C#'),
    ('php', 'Php'),
    ('laravel', 'Laravel'),
    ('vue', 'Vue'),
    ('angular', 'Angular'),
    ('testing', 'Testing'),
    ('jest', 'Jest'),
    ('cypress', 'Cypress'),
    ('communication', 'Communication'),
    ('teamwork', 'Teamwork'),
    ('firmware', 'Firmware'),
    ('embedded', 'Embedded'),
    ('microcontroller', 'Microcontroller'),
    ('arduino', 'Arduino'),
    ('raspberry pi', 'Raspberry Pi'),
    ('robotics', 'Robotics'),
    ('iot', 'Iot'),
    ('linux', 'Linux'),
    ('qa', 'Qa'),
    ('technical support', 'Technical Support'),
    ('network', 'Network'),
    ('customer service', 'Customer Service'),
    ('crm', 'CRM'),
    ('sales', 'Sales'),
    ('marketing', 'Marketing'),
    ('social media', 'Social Media'),
    ('copywriting', 'Copywriting'),
    ('graphic design', 'Graphic Design'),
    ('photoshop', 'Photoshop'),
    ('illustrator', 'Illustrator'),
    ('excel', 'Excel'),
    ('accounting', 'Accounting'),
    ('bookkeeping', 'Bookkeeping'),
    ('payroll', 'Payroll'),
    ('recruitment', 'Recruitment'),
    ('hr', 'HR'),
    ('administration', 'Administration'),
    ('data entry', 'Data Entry'),
    ('documentation', 'Documentation'),
    ('analytics', 'Analytics'),
    ('business analysis', 'Business Analysis')
),
jobs_to_backfill as (
  select
    j.id,
    lower(
      concat_ws(
        ' ',
        coalesce(j.title, ''),
        coalesce(j.description, ''),
        coalesce(array_to_string(j.responsibilities, ' '), '')
      )
    ) as search_text
  from public.jobs j
  where coalesce(array_length(j.required_skills, 1), 0) = 0
),
inferred_skills as (
  select
    jtb.id,
    coalesce(
      array_agg(distinct sk.normalized order by sk.normalized) filter (
        where jtb.search_text like '%' || sk.keyword || '%'
      ),
      '{}'::text[]
    ) as required_skills
  from jobs_to_backfill jtb
  cross join skill_keywords sk
  group by jtb.id
)
update public.jobs j
set required_skills = inferred_skills.required_skills
from inferred_skills
where j.id = inferred_skills.id
  and coalesce(array_length(j.required_skills, 1), 0) = 0;
