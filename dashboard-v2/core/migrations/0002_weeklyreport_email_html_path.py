from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='weeklyreport',
            name='email_html_path',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
    ]
